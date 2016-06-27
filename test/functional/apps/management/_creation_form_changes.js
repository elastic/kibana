
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('user input reactions', function () {
  bdd.beforeEach(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return PageObjects.settings.navigateTo();
    })
    .then(function () {
      return PageObjects.settings.clickExistingData();
    });
  });

  bdd.it('should hide time-based index pattern when time-based option is unchecked', function () {
    var self = this;
    return PageObjects.settings.getTimeBasedEventsCheckbox()
    .then(function (selected) {
      // uncheck the 'time-based events' checkbox
      return selected.click();
    })
    // try to find the checkbox (this shouldn fail)
    .then(function () {
      var waitTime = 10000;
      return PageObjects.settings.getTimeBasedIndexPatternCheckbox(waitTime);
    })
    .then(function () {
      PageObjects.common.saveScreenshot('Settings-indices-hide-time-based-index-pattern');
      // we expect the promise above to fail
      var handler = PageObjects.common.createErrorHandler(self);
      var msg = 'Found time based index pattern checkbox';
      handler(msg);
    })
    .catch(function () {
      // we expect this failure since checkbox should be hidden
      return;
    });
  });

  bdd.it('should enable creation after selecting time field', function () {
    // select a time field and check that Create button is enabled
    return PageObjects.settings.selectTimeFieldOption('@timestamp')
    .then(function () {
      return PageObjects.settings.getCreateButton().isEnabled()
      .then(function (enabled) {
        PageObjects.common.saveScreenshot('Settings-indices-enable-creation');
        expect(enabled).to.be.ok();
      });
    });
  });
});
