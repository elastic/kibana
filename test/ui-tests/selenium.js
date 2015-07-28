var assert = require('assert'),
  test = require('selenium-webdriver/testing'),
  webDriver = require('selenium-webdriver');

test.describe('Google Search', function() {
  this.timeout(5000);
  test.it('should work', function() {
    var driver = new webDriver.Builder()
      .withCapabilities(webDriver.Capabilities.chrome())
      .build();
    driver.get('http://www.google.com');
    var searchBox = driver.findElement(webDriver.By.name('q'));
    searchBox.sendKeys('webDriver');
    searchBox.getAttribute('value').then(function(value) {
      assert.equal(value, 'webDriver');
    });

    test.after(function() {
      return driver.quit();
    })
  });
});
