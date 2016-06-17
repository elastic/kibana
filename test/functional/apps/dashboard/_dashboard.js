import {
  bdd,
  common,
  dashboardPage,
  headerPage,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

var expect = require('expect.js');

bdd.describe('dashboard tab', function describeIndexTests() {
  bdd.before(function () {
    common.debug('Starting dashboard before method');
    var logstash = scenarioManager.loadIfEmpty('logstashFunctional');
    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    // and load a set of makelogs data
    .then(function loadkibanaVisualizations() {
      common.debug('load kibana index with visualizations');
      return elasticDump.elasticLoad('dashboard','.kibana');
    })
    .then(function () {
      common.debug('navigateToApp dashboard');
      return common.navigateToApp('dashboard');
    })
    // wait for the logstash data load to finish if it hasn't already
    .then(function () {
      return logstash;
    });
  });

  bdd.describe('add visualizations to dashboard', function dashboardTest() {
    var visualizations = ['Visualization漢字 AreaChart',
      'Visualization☺漢字 DataTable',
      'Visualization漢字 LineChart',
      'Visualization PieChart',
      'Visualization TileMap',
      'Visualization☺ VerticalBarChart',
      'Visualization MetricChart'
    ];

    bdd.it('should be able to add visualizations to dashboard', function addVisualizations() {
      common.saveScreenshot('Dashboard-no-visualizations');

      function addVisualizations(arr) {
        return arr.reduce(function (promise, vizName) {
          return promise
          .then(function () {
            return dashboardPage.addVisualization(vizName);
          });
        }, Promise.resolve());
      }

      return addVisualizations(visualizations)
      .then(function () {
        common.debug('done adding visualizations');
        common.saveScreenshot('Dashboard-add-visualizations');
      });
    });

    bdd.it('set the timepicker time to that which contains our test data', function setTimepicker() {
      var fromTime = '2015-09-19 06:31:44.000';
      var toTime = '2015-09-23 18:31:44.000';

      // .then(function () {
      common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return headerPage.setAbsoluteRange(fromTime, toTime)
      .then(function () {
        return headerPage.getSpinnerDone();
      })
      .then(function takeScreenshot() {
        common.saveScreenshot('Dashboard-set-timepicker');
      });
    });

    bdd.it('should save and load dashboard', function saveAndLoadDashboard() {
      const dashboardName = 'Dashboard Test 1';
      // TODO: save time on the dashboard and test it
      return dashboardPage.saveDashboard(dashboardName)
      // click New Dashboard just to clear the one we just created
      .then(function () {
        return common.try(function () {
          common.debug('saved Dashboard, now click New Dashboard');
          return dashboardPage.clickNewDashboard();
        });
      })
      .then(function () {
        return common.try(function () {
          common.debug('now re-load previously saved dashboard');
          return dashboardPage.loadSavedDashboard(dashboardName);
        });
      })
      .then(function () {
        common.saveScreenshot('Dashboard-load-saved');
      });
    });

    bdd.it('should have all the expected visualizations', function checkVisualizations() {
      return common.tryForTime(10000, function () {
        return dashboardPage.getPanelTitles()
        .then(function (panelTitles) {
          common.log('visualization titles = ' + panelTitles);
          expect(panelTitles).to.eql(visualizations);
        });
      })
      .then(function () {
        common.saveScreenshot('Dashboard-has-visualizations');
      });
    });

    bdd.it('should have all the expected initial sizes', function checkVisualizationSizes() {
      var visObjects = [ { dataCol: '1', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization漢字 AreaChart' },
        { dataCol: '4', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization☺漢字 DataTable' },
        { dataCol: '7', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization漢字 LineChart' },
        { dataCol: '10', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization PieChart' },
        { dataCol: '1', dataRow: '3', dataSizeX: '3', dataSizeY: '2', title: 'Visualization TileMap' },
        { dataCol: '4', dataRow: '3', dataSizeX: '3', dataSizeY: '2', title: 'Visualization☺ VerticalBarChart' },
        { dataCol: '7', dataRow: '3', dataSizeX: '3', dataSizeY: '2', title: 'Visualization MetricChart' }
      ];
      return common.tryForTime(10000, function () {
        return dashboardPage.getPanelData()
        .then(function (panelTitles) {
          common.log('visualization titles = ' + panelTitles);
          common.saveScreenshot('Dashboard-visualization-sizes');
          expect(panelTitles).to.eql(visObjects);
        });
      });
    });
  });
});
