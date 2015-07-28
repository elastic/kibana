'use strict';
var Header = require('./header');


function Settings(driver) {
  this.Header = new Header(driver);
  this.driver = driver;
}

Settings.prototype.constructor = Settings;

Settings.prototype.navigateToPage = function(){
  this.Header.prototype.clickTab('settings');
};

