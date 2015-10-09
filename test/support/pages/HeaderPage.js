// in test/support/pages/HeaderPage.js
define(function (require) {

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function HeaderPage(remote) {
    this.remote = remote;
  }

  var defaultTimeout = 5000;

  HeaderPage.prototype = {
    constructor: HeaderPage,

    clickDiscover: function clickDiscover() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'discover\']')
        .then(function (tab) {
          return tab.click();
        });
    },
    clickVisualize: function clickVisualize() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'visualize\']')
        .then(function (tab) {
          return tab.click();
        });
    },
    clickDashboard: function clickDashboard() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'dashboard\']')
        .then(function (tab) {
          return tab.click();
        });
    },
    clickSettings: function clickSettings() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'settings\']')
        .then(function (tab) {
          return tab.click();
        });
    }
  };

  return HeaderPage;
});
