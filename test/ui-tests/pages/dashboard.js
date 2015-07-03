'use strict';
var Header = require('./header');


function Dashboard(driver) {
  this.Header = new Header(driver);
  this.driver = driver;
}

Dashboard.prototype.constructor = Dashboard;

Dashboard.prototype.navigateToPage = function(){
  this.Header.prototype.clickTab('dashboard');
};

