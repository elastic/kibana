define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var Common = require('../../../support/pages/Common');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  var HeaderPage = require('../../../support/pages/HeaderPage');
  var SettingsPage = require('../../../support/pages/SettingsPage');

  var chartTypeTest = require('./_chart_types');
  var areaChartTest = require('./_area_chart');
  var lineChartTest = require('./_line_chart');
  var dataTableTest = require('./_data_table');
  var metricChartTest = require('./_metric_chart');
  var pieChartTest = require('./_pie_chart');
  var tileMapTest = require('./_tile_map');
  var verticalBarChartTest = require('./_vertical_bar_chart');

  bdd.describe('visualize app', function () {
    var common;
    var scenarioManager;
    var remote;
    var headerPage;
    var settingsPage;
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));

    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      common = new Common(this.remote);
      remote = this.remote;
      headerPage = new HeaderPage(this.remote);
      settingsPage = new SettingsPage(this.remote);
    });

    bdd.before(function () {
      common.debug('running bdd.beforeEach');
      this.timeout = 120000;
      // start each test with an empty kibana index
      return scenarioManager.reload('emptyKibana')
      // and load a minimal set of makelogs data
      .then(function loadIfEmptyMakelogs() {
        return scenarioManager.loadIfEmpty('logstashFunctional');
      });
    });

    bdd.after(function unloadMakelogs() {
      return scenarioManager.unload('logstashFunctional');
    });

    chartTypeTest(bdd, scenarioManager);

    areaChartTest(bdd, scenarioManager);

    lineChartTest(bdd, scenarioManager);

    dataTableTest(bdd, scenarioManager);

    metricChartTest(bdd, scenarioManager);

    pieChartTest(bdd, scenarioManager);

    tileMapTest(bdd, scenarioManager);

    verticalBarChartTest(bdd, scenarioManager);

  });
});
