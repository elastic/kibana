'use strict';
var Header = require('./header');


function Visualize(driver) {
  this.Header = new Header(driver);
  this.driver = driver;
}

Visualize.prototype.constructor = Visualize;

Visualize.prototype.navigateToPage = function(){
  this.Header.prototype.clickTab('visualize');
};

