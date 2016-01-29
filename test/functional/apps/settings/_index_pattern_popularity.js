define(function (require) {
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('index result popularity', function describeIndexTests() {
      var common;
      var settingsPage;
      var remote;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        remote = this.remote;

        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return settingsPage.navigateTo();
        });
      });

      bdd.beforeEach(function be() {
        return settingsPage.createIndexPattern();
      });

      bdd.afterEach(function ae() {
        return settingsPage.removeIndexPattern();
      });

      bdd.describe('change popularity', function indexPatternCreation() {
        var fieldName = 'geo.coordinates';

        // set the page size to All again, https://github.com/elastic/kibana/issues/5030
        // TODO: remove this after issue #5030 is closed
        function fix5030() {
          return settingsPage.setPageSize('All')
          .then(function () {
            return common.sleep(1000);
          });
        }

        bdd.beforeEach(function () {
          // increase Popularity of geo.coordinates
          return settingsPage.setPageSize('All')
          .then(function () {
            return common.sleep(1000);
          })
          .then(function openControlsByName() {
            common.debug('Starting openControlsByName (' + fieldName + ')');
            return settingsPage.openControlsByName(fieldName);
          })
          .then(function increasePopularity() {
            common.debug('increasePopularity');
            return settingsPage.increasePopularity();
          });
        });

        bdd.afterEach(function () {
          // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
          return settingsPage.controlChangeCancel();
        });

        bdd.it('should update the popularity input', function () {
          return settingsPage.getPopularity()
          .then(function (popularity) {
            common.debug('popularity = ' + popularity);
            expect(popularity).to.be('1');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should be reset on cancel', function pageHeader() {
          // Cancel saving the popularity change
          return settingsPage.controlChangeCancel()
          .then(function () {
            return fix5030();
          })
          .then(function openControlsByName() {
            return settingsPage.openControlsByName(fieldName);
          })
          // check that its 0 (previous increase was cancelled)
          .then(function getPopularity() {
            return settingsPage.getPopularity();
          })
          .then(function (popularity) {
            common.debug('popularity = ' + popularity);
            expect(popularity).to.be('0');
          })
          .catch(common.handleError(this));
        });

        bdd.it('can be saved', function pageHeader() {
          // Saving the popularity change
          return settingsPage.controlChangeSave()
          .then(function () {
            return fix5030();
          })
          .then(function openControlsByName() {
            return settingsPage.openControlsByName(fieldName);
          })
          // check that its 0 (previous increase was cancelled)
          .then(function getPopularity() {
            return settingsPage.getPopularity();
          })
          .then(function (popularity) {
            common.debug('popularity = ' + popularity);
            expect(popularity).to.be('1');
          })
          .catch(common.handleError(this));
        });
      }); // end 'change popularity'
    }); // end index result popularity
  };
});
