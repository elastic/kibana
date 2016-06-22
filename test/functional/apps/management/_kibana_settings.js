import {
  bdd,
  common,
  settingsPage,
  scenarioManager,
  esClient
} from '../../../support';

var expect = require('expect.js');

bdd.describe('creating and deleting default index', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return settingsPage.navigateTo();
    })
    .then(function () {
      return settingsPage.clickExistingData();
    })
    .then(function () {
      return settingsPage.createIndexPattern();
    })
    .then(function () {
      return settingsPage.navigateTo();
    });
  });


  bdd.it('should allow setting advanced settings', function () {
    return settingsPage.clickKibanaSettings()
    .then(function TestCallSetAdvancedSettingsForTimezone() {
      common.saveScreenshot('Settings-advanced-tab');
      common.debug('calling setAdvancedSetting');
      return settingsPage.setAdvancedSettings('dateFormat:tz', 'America/Phoenix');
    })
    .then(function GetAdvancedSetting() {
      common.saveScreenshot('Settings-set-timezone');
      return settingsPage.getAdvancedSettings('dateFormat:tz');
    })
    .then(function (advancedSetting) {
      expect(advancedSetting).to.be('America/Phoenix');
    });
  });
});
