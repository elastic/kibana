import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result popularity', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      });
    });

    beforeEach(function be() {
      return PageObjects.settings.createIndexPattern();
    });

    afterEach(function ae() {
      return PageObjects.settings.removeIndexPattern();
    });

    describe('change popularity', function indexPatternCreation() {
      const fieldName = 'geo.coordinates';

      // set the page size to All again, https://github.com/elastic/kibana/issues/5030
      // TODO: remove this after issue #5030 is closed
      function fix5030() {
        return PageObjects.settings.setPageSize('All')
        .then(function () {
          return PageObjects.common.sleep(1000);
        });
      }

      beforeEach(function () {
        // increase Popularity of geo.coordinates
        return PageObjects.settings.setPageSize('All')
        .then(function () {
          return PageObjects.common.sleep(1000);
        })
        .then(function openControlsByName() {
          log.debug('Starting openControlsByName (' + fieldName + ')');
          return PageObjects.settings.openControlsByName(fieldName);
        })
        .then(function increasePopularity() {
          log.debug('increasePopularity');
          return PageObjects.settings.increasePopularity();
        });
      });

      afterEach(function () {
        // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
        return PageObjects.settings.controlChangeCancel();
      });

      it('should update the popularity input', function () {
        return PageObjects.settings.getPopularity()
        .then(function (popularity) {
          log.debug('popularity = ' + popularity);
          expect(popularity).to.be('1');
          PageObjects.common.saveScreenshot('Settings-indices-result-popularity-updated');
        });
      });

      it('should be reset on cancel', function () {
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
          log.debug('popularity = ' + popularity);
          expect(popularity).to.be('0');
        });
      });

      it('can be saved', function () {
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
          log.debug('popularity = ' + popularity);
          expect(popularity).to.be('1');
          PageObjects.common.saveScreenshot('Settings-indices-result-popularity-saved');
        });
      });
    }); // end 'change popularity'
  }); // end index result popularity
}
