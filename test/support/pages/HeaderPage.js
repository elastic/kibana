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
        .findByCssSelector('a[href*=\'discover\']')
        .then(function (tab) {
          return tab.click();
        });
    },
    clickVisualize: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('a[href*=\'visualize\']')
        .then(function (tab) {
          return tab.click();
        });
    },
    clickDashboard: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('a[href*=\'dashboard\']')
        .then(function (tab) {
          return tab.click();
        });
    },
    clickSettings: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('a[href*=\'settings\']')
        .then(function (tab) {
          return tab.click();
        });
    },

    log: function (logString) {
      console.log(Date.now() + ' : ' + logString);
    }
  };

  return HeaderPage;
});
