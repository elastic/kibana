define(function (require) {
  var bdd = require('intern!bdd');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');

  var dashboardTest = require('./_dashboard');

  bdd.describe('dashboard app', function () {
    //var scenarioManager;
    var remote;
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));
    this.timeout = config.timeouts.default;

    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      remote = this.remote;
    });

    bdd.before(function () {
      var self = this;
      remote.setWindowSize(1200,800);
    });

    // This test REQUIRES the visualize tests to run before it.
    // This dashboard test adds the visualizations which were created by the
    // visualize tests.
    dashboardTest(bdd, scenarioManager);

  });
});
