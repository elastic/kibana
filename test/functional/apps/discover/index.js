define(function (require) {
  var bdd = require('intern!bdd');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  var discoverTest = require('./_discover');
  var fieldData = require('./_field_data');
  var sharedLinks = require('./_shared_links');
  var collapseExpand = require('./_collapse_expand');

  bdd.describe('discover app', function () {
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));
    this.timeout = config.timeouts.default;

    bdd.before(function () {
      return this.remote.setWindowSize(1200,800);
    });

    bdd.after(function unloadMakelogs() {
      return scenarioManager.unload('logstashFunctional');
    });

    discoverTest(bdd, scenarioManager);

    fieldData(bdd, scenarioManager);

    sharedLinks(bdd, scenarioManager);

    collapseExpand(bdd, scenarioManager);

  });
});
