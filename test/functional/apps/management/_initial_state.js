
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('initial state', function () {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return PageObjects.settings.navigateTo();
    })
    .then(function () {
      return PageObjects.settings.clickExistingData();
    });
  });

  bdd.it('should load with time pattern checked', function () {
    return PageObjects.settings.getTimeBasedEventsCheckbox().isSelected()
    .then(function (selected) {
      PageObjects.common.saveScreenshot('Settings-initial-state');
      expect(selected).to.be.ok();
    });
  });

  bdd.it('should load with name pattern unchecked', function () {
    return PageObjects.settings.getTimeBasedIndexPatternCheckbox().isSelected()
    .then(function (selected) {
      expect(selected).to.not.be.ok();
    });
  });

  bdd.it('should contain default index pattern', function () {
    var defaultPattern = 'logstash-*';

    return PageObjects.settings.getIndexPatternField().getProperty('value')
    .then(function (pattern) {
      expect(pattern).to.be(defaultPattern);
    });
  });

  bdd.it('should not select the time field', function () {
    return PageObjects.settings.getTimeFieldNameField().isSelected()
    .then(function (timeFieldIsSelected) {
      PageObjects.common.debug('timeField isSelected = ' + timeFieldIsSelected);
      expect(timeFieldIsSelected).to.not.be.ok();
    });
  });

  bdd.it('should not be enable creation', function () {
    return PageObjects.settings.getCreateButton().isEnabled()
    .then(function (enabled) {
      expect(enabled).to.not.be.ok();
    });
  });
});
