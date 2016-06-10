import {
  bdd,
  common,
  settingsPage,
  scenarioManager,
  esClient
} from '../../../support';

(function () {
  var expect = require('expect.js');

  (function () {
    bdd.describe('creating and deleting default index', function describeIndexTests() {
      bdd.before(function () {
        // delete .kibana index and then wait for Kibana to re-create it
        return esClient.deleteAndUpdateConfigDoc()
        .then(function () {
          return settingsPage.navigateTo().then(settingsPage.clickExistingIndicesAddDataLink);
        });
      });

      bdd.describe('index pattern creation', function indexPatternCreation() {
        bdd.before(function () {
          return settingsPage.createIndexPattern();
        });

        bdd.it('should allow setting advanced settings', function () {
          return settingsPage.clickAdvancedTab()
          .then(function TestCallSetAdvancedSettingsForTimezone() {
            common.debug('calling setAdvancedSetting');
            return settingsPage.setAdvancedSettings('dateFormat:tz', 'America/Phoenix');
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
  }());
}());
