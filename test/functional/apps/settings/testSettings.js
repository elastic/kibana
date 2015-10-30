define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');

  var Common = require('../../../support/pages/Common');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  // var HeaderPage = require('../../../support/pages/HeaderPage');
  // var pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

  bdd.describe('settings app', function () {
    var common;
    var scenarioManager;
    var remote;

    var expectedAlertText = 'Are you sure you want to remove this index pattern?';
    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      common = new Common(this.remote);
      scenarioManager = new ScenarioManager(url.format(config.elasticsearch));
      remote = this.remote;
    });

    bdd.beforeEach(function () {
      // start each test with an empty kibana index
      return scenarioManager.reload('emptyKibana')
      // and load a minimal set of makelogs data
      .then(function loadIfEmptyMakelogs() {
        return scenarioManager.loadIfEmpty('makelogs');
      })
      .then(function () {
        return common.sleep(3000);
      })
      .then(function () {
        return common.tryForTime(25000, function () {
          return remote.get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            // give angular enough time to update the URL
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

    require('./_initial_state')(bdd);

  });
});
