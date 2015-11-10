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

    clickSelector: function (selector) {
      var self = this.remote;
      return common.tryForTime(5000, function () {
        return self.setFindTimeout(defaultTimeout)
        .findByCssSelector(selector)
        .then(function (tab) {
          return tab.click();
        });
      });
    },

    clickDiscover: function () {
      common.debug('click Discover tab');
      this.clickSelector('a[href*=\'discover\']');
    },

    clickVisualize: function () {
      common.debug('click Visualize tab');
      this.clickSelector('a[href*=\'visualize\']');
    },

    clickDashboard: function () {
      common.debug('click Dashboard tab');
      this.clickSelector('a[href*=\'dashboard\']');
    },

    clickSettings: function () {
      common.debug('click Settings tab');
      this.clickSelector('a[href*=\'settings\']');
    }
  };

  return HeaderPage;
});
