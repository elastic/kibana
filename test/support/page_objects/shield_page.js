
import {
  defaultFindTimeout,
} from '../';

export default class ShieldPage {

  init(remote) {
    this.remote = remote;
  }

  login(user, pwd) {
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

}
