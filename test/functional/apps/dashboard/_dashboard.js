
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('dashboard tab', function describeIndexTests() {
  bdd.before(function () {
    PageObjects.common.debug('Starting dashboard before method');
    var logstash = scenarioManager.loadIfEmpty('logstashFunctional');
    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    // and load a set of makelogs data
    .then(function loadkibanaVisualizations() {
      PageObjects.common.debug('load kibana index with visualizations');
      return elasticDump.elasticLoad('dashboard','.kibana');
    })
    .then(function () {
      PageObjects.common.debug('navigateToApp dashboard');
      return PageObjects.common.navigateToApp('dashboard');
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
      PageObjects.common.saveScreenshot('Dashboard-no-visualizations');

      function addVisualizations(arr) {
        return arr.reduce(function (promise, vizName) {
          return promise
          .then(function () {
            return PageObjects.dashboard.addVisualization(vizName);
          });
        }, Promise.resolve());
      }

      return addVisualizations(visualizations)
      .then(function () {
        PageObjects.common.debug('done adding visualizations');
        PageObjects.common.saveScreenshot('Dashboard-add-visualizations');
      });
    });

    bdd.it('set the timepicker time to that which contains our test data', function setTimepicker() {
      var fromTime = '2015-09-19 06:31:44.000';
      var toTime = '2015-09-23 18:31:44.000';

      // .then(function () {
      PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime)
      .then(function () {
        return PageObjects.header.getSpinnerDone();
      })
      .then(function takeScreenshot() {
        PageObjects.common.saveScreenshot('Dashboard-set-timepicker');
      });
    });

    bdd.it('should save and load dashboard', function saveAndLoadDashboard() {
      const dashboardName = 'Dashboard Test 1';
      // TODO: save time on the dashboard and test it
      return PageObjects.dashboard.saveDashboard(dashboardName)
      // click New Dashboard just to clear the one we just created
      .then(function () {
        return PageObjects.common.try(function () {
          PageObjects.common.debug('saved Dashboard, now click New Dashboard');
          return PageObjects.dashboard.clickNewDashboard();
        });
      })
      .then(function () {
        return PageObjects.common.try(function () {
          PageObjects.common.debug('now re-load previously saved dashboard');
          return PageObjects.dashboard.loadSavedDashboard(dashboardName);
        });
      })
      .then(function () {
        PageObjects.common.saveScreenshot('Dashboard-load-saved');
      });
    });

    bdd.it('should have all the expected visualizations', function checkVisualizations() {
      return PageObjects.common.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelTitles()
        .then(function (panelTitles) {
          PageObjects.common.log('visualization titles = ' + panelTitles);
          expect(panelTitles).to.eql(visualizations);
        });
      })
      .then(function () {
        PageObjects.common.saveScreenshot('Dashboard-has-visualizations');
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
      return PageObjects.common.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelData()
        .then(function (panelTitles) {
          PageObjects.common.log('visualization titles = ' + panelTitles);
          PageObjects.common.saveScreenshot('Dashboard-visualization-sizes');
          expect(panelTitles).to.eql(visObjects);
        });
      });
    });
  });
});
