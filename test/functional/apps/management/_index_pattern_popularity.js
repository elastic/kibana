
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('index result popularity', function describeIndexTests() {
  bdd.before(function () {
    // delete .kibana index and then wait for Kibana to re-create it
    return esClient.deleteAndUpdateConfigDoc()
    .then(function () {
      return PageObjects.settings.navigateTo();
    });
  });

  bdd.beforeEach(function be() {
    return PageObjects.settings.createIndexPattern();
  });

  bdd.afterEach(function ae() {
    return PageObjects.settings.removeIndexPattern();
  });

  bdd.describe('change popularity', function indexPatternCreation() {
    var fieldName = 'geo.coordinates';

    // set the page size to All again, https://github.com/elastic/kibana/issues/5030
    // TODO: remove this after issue #5030 is closed
    function fix5030() {
      return PageObjects.settings.setPageSize('All')
      .then(function () {
        return PageObjects.common.sleep(1000);
      });
    }

    bdd.beforeEach(function () {
      // increase Popularity of geo.coordinates
      return PageObjects.settings.setPageSize('All')
      .then(function () {
        return PageObjects.common.sleep(1000);
      })
      .then(function openControlsByName() {
        PageObjects.common.debug('Starting openControlsByName (' + fieldName + ')');
        return PageObjects.settings.openControlsByName(fieldName);
      })
      .then(function increasePopularity() {
        PageObjects.common.debug('increasePopularity');
        return PageObjects.settings.increasePopularity();
      });
    });

    bdd.afterEach(function () {
      // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
      return PageObjects.settings.controlChangeCancel();
    });

    bdd.it('should update the popularity input', function () {
      return PageObjects.settings.getPopularity()
      .then(function (popularity) {
        PageObjects.common.debug('popularity = ' + popularity);
        expect(popularity).to.be('1');
        PageObjects.common.saveScreenshot('Settings-indices-result-popularity-updated');
      });
    });

    bdd.it('should be reset on cancel', function pageHeader() {
      // Cancel saving the popularity change
      return PageObjects.settings.controlChangeCancel()
      .then(function () {
        return fix5030();
      })
      .then(function openControlsByName() {
        return PageObjects.settings.openControlsByName(fieldName);
      })
      // check that its 0 (previous increase was cancelled)
      .then(function getPopularity() {
        return PageObjects.settings.getPopularity();
      })
      .then(function (popularity) {
        PageObjects.common.debug('popularity = ' + popularity);
        expect(popularity).to.be('0');
      });
    });

    bdd.it('can be saved', function pageHeader() {
      // Saving the popularity change
      return PageObjects.settings.controlChangeSave()
      .then(function () {
        return fix5030();
      })
      .then(function openControlsByName() {
        return PageObjects.settings.openControlsByName(fieldName);
      })
      // check that its 0 (previous increase was cancelled)
      .then(function getPopularity() {
        return PageObjects.settings.getPopularity();
      })
      .then(function (popularity) {
        PageObjects.common.debug('popularity = ' + popularity);
        expect(popularity).to.be('1');
        PageObjects.common.saveScreenshot('Settings-indices-result-popularity-saved');
      });
    });
  }); // end 'change popularity'
}); // end index result popularity
