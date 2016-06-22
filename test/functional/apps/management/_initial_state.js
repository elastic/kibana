import {
  bdd,
  common,
  scenarioManager,
  settingsPage,
  esClient
} from '../../../support';

var expect = require('expect.js');

bdd.describe('initial state', function () {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return settingsPage.navigateTo();
    })
    .then(function () {
      return settingsPage.clickExistingData();
    });
  });

  bdd.it('should load with time pattern checked', function () {
    return settingsPage.getTimeBasedEventsCheckbox().isSelected()
    .then(function (selected) {
      common.saveScreenshot('Settings-initial-state');
      expect(selected).to.be.ok();
    });
  });

  bdd.it('should load with name pattern unchecked', function () {
    return settingsPage.getTimeBasedIndexPatternCheckbox().isSelected()
    .then(function (selected) {
      expect(selected).to.not.be.ok();
    });
  });

  bdd.it('should contain default index pattern', function () {
    var defaultPattern = 'logstash-*';

    return settingsPage.getIndexPatternField().getProperty('value')
    .then(function (pattern) {
      expect(pattern).to.be(defaultPattern);
    });
  });

  bdd.it('should not select the time field', function () {
    return settingsPage.getTimeFieldNameField().isSelected()
    .then(function (timeFieldIsSelected) {
      common.debug('timeField isSelected = ' + timeFieldIsSelected);
      expect(timeFieldIsSelected).to.not.be.ok();
    });
  });

  bdd.it('should not be enable creation', function () {
    return settingsPage.getCreateButton().isEnabled()
    .then(function (enabled) {
      expect(enabled).to.not.be.ok();
    });
  });
});
