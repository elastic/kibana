define(function (require) {
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('creating and deleting default index', function describeIndexTests() {
      var common;
      var settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);

        return settingsPage.navigateTo();
      });

      bdd.describe('log Version, Build, Commit SHA, Server name', function logAboutInfo() {

        bdd.it('should allow setting advanced settings', function () {
          return settingsPage.clickAboutTab()
          .then(function getVersion() {
            common.log('calling getVersion');
            return settingsPage.getVersion();
          })
          .then(function GetAdvancedSetting() {
            return settingsPage.getAdvancedSettings('dateFormat:tz');
          })
          .then(function (advancedSetting) {
            expect(advancedSetting).to.be('America/Phoenix');
          })
          .catch(common.handleError(this));
        });

      });
    });
  };
});
