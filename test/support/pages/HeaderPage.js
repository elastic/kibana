// in test/support/pages/HeaderPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function HeaderPage(remote) {
    this.remote = remote;
  }

  HeaderPage.prototype = {
    constructor: HeaderPage,

    clickDiscover: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('/html/body/div[2]/nav/div[2]/ul[1]/li[3]/a')
        .click();
    },
    clickVisualize: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('.//*[@id=\'kibana-body\']/div[2]/nav/div[2]/ul[1]/li[4]/a')
        .click();
    },
    clickDashboard: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//a[@href=\'#/dashboard.*\']')
        .click();
    },
    clickSettings: function () {
      return this.remote
        .setFindTimeout(15000)
        .findByXpath('//a[@ng-href=\'#/settings\']')
        .click();
    }
  };

  return HeaderPage;
});
