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
  var runElasticdump  = require('../../../support/run_elasticdump');  // <<<<<<<<<<<<
  var moment = require('moment');

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
        common.debug('loadIfEmpty logstashFunctional ' + self.timeout);
        return scenarioManager.loadIfEmpty('logstashFunctional');
      })
      .then(function () {
        common.debug('simple command test = ' + common.execCommand('cmd.exe /c "echo %windir%"'));
        // common.debug('simple command test = '
        //  + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump --input=http://localhost:9200/.kibana'
        //  + ' --output=kibana_w_indexPattern.JSON  --type=data --bulk-use-output-index-name"'));
        // cmd.exe node c:\git\elasticsearch-dump\bin\elasticdump
        // /c/git/elasticsearch-dump/bin/elasticdump --debug --input=http://localhost:9200/.kibana --output=kibana.JSON  --type=data --bulk-use-output-index-name
        // /c/git/elasticsearch-dump/bin/elasticdump --debug --input=kibana.JSON --output=http://localhost:9200/.kibana
        //common.debug('Saving .kibana index = ' + common.snapshot('.kibana'));
        common.debug('navigateTo');
        return settingsPage.navigateTo();
      })
      // .then(function () {
      //   common.debug('createIndexPattern');
      //   return settingsPage.createIndexPattern();
      // })
      // .then(function () {
      //   return settingsPage.clickAdvancedTab();
      // })
      .then(function GetAdvancedSetting() {
        // common.debug('simple command test = ' + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump --input=http://localhost:9200/.kibana --output=kibana.JSON  --type=data --bulk-use-output-index-name"'));
        common.debug('Load kibana index with logstash index pattern'
          + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
          + ' --input=kibana.JSON --output=http://localhost:9200/.kibana"'));
        // return settingsPage.getAdvancedSettings('dateFormat:tz');
      // })
      // .then(function (advancedSetting) {
      //   expect(advancedSetting).to.be('UTC');
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

    bdd.after(function () {
      common.debug('Save kibana index with Visualizations'
        + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
        + ' --input=http://localhost:9200/.kibana --output=kibanaVis-' + moment().format('YYYY-MM-DD_HH-m-s') + '.JSON"'
        + '  --type=data'));
        // + '  --type=data --bulk-use-output-index-name'));
      common.debug('Save kibana mapping with Visualizations'
        + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
        + ' --input=http://localhost:9200/.kibana --output=kibanaVis-mapping-' + moment().format('YYYY-MM-DD_HH-m-s') + '.JSON"'
        + '  --type=mapping'));
    });

  });
});
