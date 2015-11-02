define(function (require) {
  var Common = require('../../../support/pages/Common');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd) {
    bdd.describe('create button states', function () {
      var common;
      var settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
      });

      bdd.it('should not be initially enabled', function () {
        return settingsPage.getCreateButton().isEnabled()
        .then(function (enabled) {
          expect(enabled).to.not.be.ok();
        })
        .catch(common.handleError(this));
      });

      bdd.it('should be enabled after selecting time field option', function () {
        // select a time field and check that Create button is enabled
        return settingsPage.selectTimeFieldOption('@timestamp')
        .then(function () {
          return settingsPage.getCreateButton().isEnabled()
          .then(function (enabled) {
            expect(enabled).to.be.ok();
          });
        })
        .catch(common.handleError(this));
      });
    });
  };
});
