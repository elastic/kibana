'use strict';
var Base = require('../lib/base');
var webDriver = require('selenium-webdriver');

function Header(driver) {
  Base.call(this, driver);
}

Header.prototype.selectors = {
  nav: {
    _discover : "#kibana-primary-navbar ul li a[href*='discover']",
    _visualize: "#kibana-primary-navbar ul li a[href*='visualize']",
    _dashboard: "#kibana-primary-navbar ul li a[href*='dashboard']",
    _settings: "#kibana-primary-navbar ul li a[href*='settings']"
  }
};

Header.prototype.clickTab = function(tabName) {
  switch(tabName){
    case 'discover' : {
      this.findElement(webDriver.By.css(this.selectors.nav._discover));
      break;
    }
    case 'visualize' : {
      this.findElement(webDriver.By.css(this.selectors.nav._visualize));
      break;
    }
    case 'dashboard': {
      this.findElement(webDriver.By.css(this.selectors.nav._dashboard));
      break;
    }
    default:{
      this.findElement(webDriver.By.css(this.selectors.nav._settings));
      break;
    }
  }
};
