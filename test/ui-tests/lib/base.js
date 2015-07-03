function Base(driver){
  this.driver = driver;
}
Base.prototype = {
  find: function(locator) {
    return this.driver.findElement(locator);
  },
  navigateHome: function(url) {
    this.driver.get('http://localhost:5601');
  },
  clear: function(locator) {
    this.find(locator).clear();
  },
  click: function(locator) {
    this.find(locator).click();
  },
  getText: function(locator) {
    this.find(locator).text;
  },
  isDisplayed: function(locator) {

  },
  typeKeys: function(locator, string) {
    this.driver.findElement(locator).sendKeys(string);
  }
};
