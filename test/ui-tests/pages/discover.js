'use strict';
var Header = require('./header');


function Discover(driver) {
  this.Header = new Header(driver);
  this.driver = driver;
}

Discover.prototype.constructor = Discover;

Discover.prototype.navigateToPage = function(){
  this.Header.prototype.clickTab('discover');
};
