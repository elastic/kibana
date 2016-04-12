define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var Common = require('../../../support/pages/common');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');

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
    var remote;
    var headerPage;
    var settingsPage;
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));
    this.timeout = config.timeouts.default;

    // on setup, we create a settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      common = new Common(this.remote);
      remote = this.remote;
      headerPage = new HeaderPage(this.remote);
      settingsPage = new SettingsPage(this.remote);
    });

    bdd.before(function () {
      var self = this;
      remote.setWindowSize(1200,800);
      // load a set of makelogs data
      common.debug('scenarioManager.reload(emptyKibana)');
      return scenarioManager.reload('emptyKibana')
      .then(function () {
        common.debug('loadIfEmpty logstashFunctional ');
        return scenarioManager.loadIfEmpty('logstashFunctional');
      })
      .then(function () {
        common.debug('navigateTo');
        return settingsPage.navigateTo();
      })
      .then(function () {
        common.debug('createIndexPattern');
        return settingsPage.createIndexPattern();
      })
      .then(function () {
        return settingsPage.clickAdvancedTab();
      })
      .then(function GetAdvancedSetting() {
        common.debug('check for required UTC timezone');
        return settingsPage.getAdvancedSettings('dateFormat:tz');
      })
      .then(function (advancedSetting) {
        expect(advancedSetting).to.be('UTC');
      });
    });


    chartTypeTest(bdd, scenarioManager);

    // these are in reverse alpha order so the newest one being created and
    // tested is at the top of the list and on the first page of the
    // saved visualizations to open
    verticalBarChartTest(bdd, scenarioManager);

    tileMapTest(bdd, scenarioManager);

    pieChartTest(bdd, scenarioManager);

    metricChartTest(bdd, scenarioManager);

    lineChartTest(bdd, scenarioManager);

    dataTableTest(bdd, scenarioManager);

    areaChartTest(bdd, scenarioManager);


  });
});
