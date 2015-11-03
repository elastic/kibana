define(function (require) {
  var Common = require('../../../support/pages/Common');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var expect = require('intern/dojo/node!expect.js');
  //var Promise = require('bluebird');

  return function (bdd) {
    bdd.describe('index result popularity', function describeIndexTests() {
      var common;
      var settingsPage;
      var remote;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        remote = this.remote;
      });

      bdd.beforeEach(function be() {
        return settingsPage.createIndex();
      });

      bdd.afterEach(function ae() {
        return settingsPage.removeIndex();
      });


      bdd.describe('change popularity', function indexPatternCreation() {

        bdd.it('can be cancelled', function pageHeader() {
          return settingsPage.setPageSize('All')
          // increase Popularity
          .then(function openControlsByName() {
            common.log('Starting openControlsByName "geo.coordinates"');
            return settingsPage.openControlsByName('geo.coordinates');
          })
          .then(function increasePopularity() {
            common.log('increasePopularity');
            return settingsPage.increasePopularity();
          })
          .then(function getPopularity() {
            return settingsPage.getPopularity();
          })
          .then(function (popularity) {
            common.log('popularity = ' + popularity);
            expect(popularity).to.be('1');
          })
          // Cancel saving the popularity change
          .then(function controlChangeCancel() {
            return settingsPage.controlChangeCancel();
          })
          // set the page size to All again, https://github.com/elastic/kibana/issues/5030
          .then(function () {
            return settingsPage.setPageSize('All');
          })
          .then(function openControlsByName() {
            return settingsPage.openControlsByName('geo.coordinates');
          })
          // check that its 0 (previous increase was cancelled)
          .then(function getPopularity() {
            return settingsPage.getPopularity()
          .then(function (popularity) {
            common.log('popularity = ' + popularity);
            expect(popularity).to.be('0');
          })
          // Cancel saving the popularity change (we were just checking)
          .then(function controlChangeCancel() {
            return settingsPage.controlChangeCancel();
          })
          .catch(common.handleError(this));
          });
        });

        bdd.it('can be saved', function pageHeader() {
          return settingsPage.setPageSize('All')
          // increase Popularity
          .then(function openControlsByName() {
            common.log('Starting openControlsByName "geo.coordinates"');
            return settingsPage.openControlsByName('geo.coordinates');
          })
          .then(function increasePopularity() {
            return settingsPage.increasePopularity();
          })
          // Saving the popularity change
          .then(function controlChangeSave() {
            return settingsPage.controlChangeSave();
          })
          // set the page size to All again, https://github.com/elastic/kibana/issues/5030
          .then(function () {
            return settingsPage.setPageSize('All');
          })
          // open it again to see that it saved
          .then(function openControlsByName() {
            return settingsPage.openControlsByName('geo.coordinates');
          })
          // check that its 0 (previous increase was cancelled)
          .then(function getPopularity() {
            return settingsPage.getPopularity();
          })
          .then(function (popularity) {
            common.log('popularity = ' + popularity);
            expect(popularity).to.be('1');
          })
          // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
          .then(function controlChangeCancel() {
            return settingsPage.controlChangeCancel();
          })
          .catch(common.handleError(this));
        });

      }); // end 'change popularity'

    }); // end index result popularity
  };
});
