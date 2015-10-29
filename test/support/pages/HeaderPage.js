// in test/support/pages/HeaderPage.js
define(function (require) {

  var Common = require('./Common');

  var common;

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function HeaderPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);

  }

  var defaultTimeout = 5000;

  HeaderPage.prototype = {
    constructor: HeaderPage,

    clickDiscover: function clickDiscover() {
      common.log('Click Discover tab');
      return this.remote.setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'discover\']')
        .then(function (tab) {
          return tab.click();
        });
    },

    clickVisualize: function clickVisualize() {
      var self = this.remote;
      common.log('Click Visualize tab');
      return common.tryForTime(5000, function () {
        return self.setFindTimeout(defaultTimeout)
          .findByCssSelector('a[href*=\'visualize\']')
          .then(function (tab) {
            return tab.click();
          });
      });
    },

    clickDashboard: function clickDashboard() {
      common.log('Click Dashboard tab');
      return this.remote.setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'dashboard\']')
        .then(function (tab) {
          return tab.click();
        });
    },

    clickSettings: function clickSettings() {
      common.log('Click Settings tab');
      return this.remote.setFindTimeout(defaultTimeout)
        .findByCssSelector('a[href*=\'settings\']')
        .then(function (tab) {
          return tab.click();
        });
    }
  };

  return HeaderPage;
});
