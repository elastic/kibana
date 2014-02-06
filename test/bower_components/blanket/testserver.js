/* modules */
var url = require('url'),
express = require('express');

/* init */
var app = express.createServer();
app.use(require('express').bodyParser());

app.configure(function(){
app.use(express.static(__dirname));
});

app.get('*', function(req, res){
res.render('./runner.html');
});

app.listen(3000);
console.log("App started.");
