// in test/support/pages/shield_page.js
define(function (require) {
  var config = require('intern').config;
  var defaultTimeout = config.timeouts.default;

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function ShieldPage(remote) {
    this.remote = remote;
  }

  ShieldPage.prototype = {
    constructor: ShieldPage,

    login: function login(user, pwd) {
      var self = this.remote;
      return self.setFindTimeout(5000)
      .findById('username')
      .type(user)
      .then(function () {
        return self.findById('password')
        .type(pwd);
      })
      .then(function () {
        return self.findByCssSelector('.btn')
        .click();
      });
    }


  };

  return ShieldPage;
});
