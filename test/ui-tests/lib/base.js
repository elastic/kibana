function Base(driver){
  this.driver = driver;
}
Base.prototype = {
  findElement: function() {
    this.driver.findElement()
  },
  visit: function(url) {
    this.driver.get('http://localhost:5601');
  }
};
