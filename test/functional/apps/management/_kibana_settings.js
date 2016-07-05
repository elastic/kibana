
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('creating and deleting default index', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return PageObjects.settings.navigateTo();
    })
    .then(function () {
      return PageObjects.settings.clickExistingData();
    })
    .then(function () {
      return PageObjects.settings.createIndexPattern();
    })
    .then(function () {
      return PageObjects.settings.navigateTo();
    });
  });


  bdd.it('should allow setting advanced settings', function () {
    return PageObjects.settings.clickKibanaSettings()
    .then(function TestCallSetAdvancedSettingsForTimezone() {
      PageObjects.common.saveScreenshot('Settings-advanced-tab');
      PageObjects.common.debug('calling setAdvancedSetting');
      return PageObjects.settings.setAdvancedSettings('dateFormat:tz', 'America/Phoenix');
    })
    .then(function GetAdvancedSetting() {
      PageObjects.common.saveScreenshot('Settings-set-timezone');
      return PageObjects.settings.getAdvancedSettings('dateFormat:tz');
    })
    .then(function (advancedSetting) {
      expect(advancedSetting).to.be('America/Phoenix');
    });
  });
});
