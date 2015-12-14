define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var Common = require('../../../support/pages/Common');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  var discoverTest = require('./_discover');

  bdd.describe('discover app', function () {
    var common;
    var scenarioManager;
    var remote;
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));
    this.timeout = 120000;

    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      common = new Common(this.remote);
      remote = this.remote;
    });

    bdd.after(function unloadMakelogs() {
      return scenarioManager.unload('logstashFunctional');
    });

    discoverTest(bdd, scenarioManager);

  });
});
