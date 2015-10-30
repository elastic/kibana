define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  var pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');
  var Common = require('../../../support/pages/Common');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var HeaderPage = require('../../../support/pages/HeaderPage');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var initialStateTest = require('./_initial_state');

  bdd.describe('settings app', function () {
    var common;
    var settingsPage;
    var headerPage;
    var scenarioManager;
    var remote;

    var expectedAlertText = 'Are you sure you want to remove this index pattern?';
    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      common = new Common(this.remote);
      settingsPage = new SettingsPage(this.remote);
      common.log('running bdd.before');
      headerPage = new HeaderPage(this.remote);
      scenarioManager = new ScenarioManager(url.format(config.elasticsearch));
      remote = this.remote;
      console.log('common = ', common);
    });

    bdd.beforeEach(function () {

      // start each test with an empty kibana index
      return scenarioManager.reload('emptyKibana')
      // and load a minimal set of makelogs data
      .then(function loadIfEmptyMakelogs() {
        return scenarioManager.loadIfEmpty('makelogs');
      })
      .then(function () {
        return common.sleep(2500);
      })
      .then(function () {
        return common.tryForTime(25000, function () {
          return remote.get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            return common.sleep(2000);
          })
          .then(function () {
            return remote.getCurrentUrl()
            .then(function (currentUrl) {
              expect(currentUrl).to.contain('settings');
            });
          });
        });
      });
    });

    bdd.after(function unloadMakelogs() {
      return scenarioManager.unload('makelogs');
    });

    /*
     ** Test the default state of checboxes and the 2 text input fields
     */
    bdd.describe('initial state', function () {
      initialStateTest(bdd, expect, common, settingsPage);
    });

  });
});
