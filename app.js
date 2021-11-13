const express = require('express')
const bodyParser = require("body-parser")
const cors = require('cors')
const app = express()
const exphbs = require('express-handlebars')
const mongoose = require('mongoose')
const handlebars = require('handlebars')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const { urlencoded } = require('body-parser')
const { response } = require('express')
const session = require('express-session');
const flash = require('connect-flash')

//cors
app.use(cors())

//express session
app.use(
    session({
      secret: 'secret',
      resave: true,
      saveUninitialized: true
    })
  );

//session middleware
app.use(flash());

// global variable
app.use((req,res,next)=>{
    res.locals.success_message = req.flash("success_message")
    res.locals.error_message = req.flash("error_msg")
    res.locals.user_type = req.flash("userType")
    res.locals.authA = req.flash('authA')

    next()
})


// setting up body parser middleware
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())

// setting up express static
app.use(express.static("public"))

// connecting to database : Stocker 
mongoose.connect("mongodb://mongo:27017/Stocker", {useNewUrlParser:true, useUnifiedTopology: true})
.then(()=>{
    console.log("connected to DB")
})
.catch(err=>{
    if (err) throw err
})

// setting up schemas 
// User schema 

mongoose.model('dailysales', {
    dailySale: String,
    Dt: String,
    dateSaleWasMade: { type: Date, default: new Date(Date.now()).toLocaleString() }
    
}, 'dailysales')

let DailySales = mongoose.model('dailysales')

mongoose.model("users",{
    oid: String,
    password: String
}, 'users')

// Admin schema

mongoose.model("admin",{
    oid: String,
    password: String
}, 'admin')

// sales model
mongoose.model("sales" ,{
    sales: {
        type: Array,
    },
}, 'sales')

// stock model
mongoose.model('stock', {
    name: String,
    price: String,
    qty: String
}, 'stock')

let Stock = mongoose.model("stock")

let Sales = mongoose.model("sales")

let Admin = mongoose.model('admin')

// initializing users model
let Users = mongoose.model("users")

// setting the template engine
app.engine('handlebars', exphbs({handlebars: allowInsecurePrototypeAccess(handlebars)}))
app.set('view engine', 'handlebars')


// home route : which will render the login page
app.get("/", (req,res)=>{
    res.render('login')
})

app.post("/users", (req,res)=>{
    // request body

    let loggingUser = {
        oid: req.body.oid,
        password: req.body.password
    }

    // console.log(req.body)


    

    // check to see if user wants to log in as administrator 
    if(req.body.asAdmin !== "on"){

        // query user credentials and redirect to dashboard
        Users.findOne(loggingUser)
        .then((response)=>{
            console.log(response)
            let errorMessage = 'No User Found, Check credentials and try again'

            if(!response){
                res.render("login", {errorMessage, id: req.body.oid, password: req.body.password})
             }

             else if(response){
                 console.log(response)
                 req.flash("userType", response.oid)
                res.redirect("/dashboard")
                return
             }
            
           
        })
        .catch((err)=>{
            if (err) throw err
        })
        

    }
    else if(req.body.asAdmin == "on"){

        Admin.findOne({oid: req.body.oid, password:req.body.password})
        .then((response) =>{
            console.log(response)

            let errorMessage = 'No User Found, Check credentials and try again'

            if(!response){
                res.render('login', {errorMessage, id: req.body.oid, password: req.body.password})
                // res.redirect("/")
            }

            else if(response){
                req.flash("authA", 'authAd')
                res.redirect("/adminDashboard")
                return
             }
            
        })
        .catch(err=>{
            if(err) throw err
        })
      
    }

    


})

app.get("/dashboard", (req,res)=>{
    Stock.find({}).then(response=>{
        // console.log(response)
        res.render("dashboard", {response})

    })

})

app.get('/adminDashboard', (req,res)=>{
    Sales.find({}).sort()
    .then((response)=>{
            console.log(response)
            res.render("adminDashboard", {response:  response[0].sales})


    })
    .catch(error => {
        if(error) throw error
    })

    

})


app.get('/createAccount', (req,res)=>{
    res.render('createAccount')
})

app.post('/createAccount', (req,res)=>{
    console.log(req.body)
    if(req.body.asAdmin == 'on'){
        new Admin({oid: req.body.oid, password: req.body.password})
        .save()
        .then(response=>{
            req.flash("success_message", "Added 1 Administrator")
            res.redirect("/createAccount")

        })
        .catch(err=>{
            if (err) throw err
        })
    }
    else{
        new Users({
            oid: req.body.oid,
            password: req.body.password
        })
        .save()
        .then((resp)=>{
            req.flash("success_message", "Added 1 User")
            res.redirect("/createAccount")

            console.log(resp)
        })
        .catch(err=> {
            if (err) throw err
        })
    }
   
})

// manage inventory

app.get("/manageInventory", (req,res)=>{
    Stock.find({}).then((response)=> {
        console.log(response)
        res.render("manageInventory", {response:response})
        
    })
    .catch(err=>{
        if (err) throw err
    })
    
})

app.get("/manageInventoryapi", (req,res)=>{
    Stock.find({}).then((response)=> {
        console.log(response)
        res.json(response)
        // res.render("manageInventory", {response:response})
        
    })
    .catch(err=>{
        if (err) throw err
    })
    
})

app.get("/manageInventoryapi/:id", (req,res)=>{
    console.log(req.params.id)
    Stock.find({_id: req.params.id}).then((response)=> {
        console.log(response)
        res.json(response)
        // res.render("manageInventory", {response:response})
        
    })
    .catch(err=>{
        if (err) throw err
    })
    
})

// delete item from inventory
app.get('/deleteInventory/:id', (req,res)=>{
    Stock.deleteOne({_id: req.params.id}).then((response)=>{
        console.log(response)
        req.flash("success_message", "1 item deleted")
        res.redirect("/manageInventory")
    })

    console.log(req.params)
})

// update item in inventory

app.post("/editInventoryItem", (req,res)=>{
    console.log(req.body)

    Stock.updateOne({_id : req.body.id}, {name : req.body.name, price: req.body.price, qty: req.body.qty})
    .then((response)=>{
        console.log(response)
        req.flash("success_message", "1 item Updated")
        res.redirect("/manageInventory")

    })
})

// add Item to inventory
app.post("/addInventoryItem", (req,res)=>{
    console.log(req.body)

    new Stock({name : req.body.name, price: req.body.price, qty: req.body.qty})
    .save()
    .then((response)=>{
        console.log(response)
        req.flash('success_message', "1 Item Added")
        res.redirect("/manageInventory")
        
    })
})

app.get('/gcbhq', (req,res)=>{
    res.redirect('/dashboard')
})

app.post('/dailySales', (req,res)=>{
    console.log(req.body.date)
    let data = req.body
    new DailySales({
        dailySale: data.dailySale,
        Dt:data.date
    })
    .save()
})

app.get('/dailySales', (req,res)=>{
    res.render('dailysale')
})

app.post('/makeSale', (req,res)=>{
    console.log(req.body)
    let newQty = 0

    req.body.forEach(item => {
        
        
        Stock.updateOne({_id :item.id}, {qty: item.qtyUpdate})
        .then(response =>{
            console.log(response)  

           
        })
        .catch(err => {if (err) throw err})

       


    });

    // Sales.updateOne(
    //     {_id: "6036ced94715752dfe9faa60"},
    //     {$push: {sales: req.body}},
    //     done
    // )
    
    // updated the sales feature to stack new sales att the beginning
    Sales.update({_id: '619026eecdf6fb111fb34418'},{ $push: {sales: {$each: [req.body], $position: 0}}} ).then(response => console.log(response))
    req.flash("success_message", "You've successfully made a sale")
    res.redirect('/dashboard')
})

// setting up port 
const  Port  = 4000;

// listening on port 
app.listen(Port, ()=>{
    console.log("listening on Port " + Port )
})