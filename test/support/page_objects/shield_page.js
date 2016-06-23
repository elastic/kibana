import { remote, defaultFindTimeout } from '../';

// in test/support/pages/shield_page.js
export default (function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function ShieldPage() {
  }

  ShieldPage.prototype = {
    constructor: ShieldPage,

    init(remote) {
      this.remote = remote;
    },

    login: function login(user, pwd) {
      var remote = this.remote;
      return remote.setFindTimeout(defaultFindTimeout)
      .findById('username')
      .type(user)
      .then(function () {
        return remote.findById('password')
        .type(pwd);
      })
      .then(function () {
        return remote.findByCssSelector('.btn')
        .click();
      });
    }


  };

  return ShieldPage;
}());
