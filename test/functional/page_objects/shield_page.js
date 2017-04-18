export function ShieldPageProvider({ getService }) {
  const remote = getService('remote');
  const config = getService('config');

  const defaultFindTimeout = config.get('timeouts.find');

  class ShieldPage {
    login(user, pwd) {
      return remote.setFindTimeout(defaultFindTimeout)
      .findById('username')
      .type(user)
      .then(function () {
        return remote.findById('password')
        .type(pwd);
      })
      .then(function () {
        return remote.findByCssSelector('button')
        .click();
      });
    }
  }

  return new ShieldPage();
}
