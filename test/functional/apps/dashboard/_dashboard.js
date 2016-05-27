import {
  bdd,
  common,
  dashboardPage,
  headerPage,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

(function () {
  var expect = require('expect.js');

  (function () {
    bdd.describe('dashboard tab', function describeIndexTests() {

      bdd.before(function () {

        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

        common.debug('Starting dashboard before method');
        common.debug('navigateToApp dashboard');
        return esClient.delete('.kibana')
        .then(function () {
          return common.try(function () {
            return esClient.updateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'});
          });
        })
        // and load a set of makelogs data
        .then(function loadkibana4() {
          common.debug('load kibana index with visualizations');
          return elasticDump.elasticLoad('dashboard','.kibana');
        })
        .then(function () {
          return scenarioManager.loadIfEmpty('logstashFunctional');
        })
        .then(function () {
          return common.navigateToApp('dashboard');
        })
        .catch(common.handleError(this));
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
          });

        });

        bdd.it('set the timepicker time to that which contains our test data', function setTimepicker() {
          var fromTime = '2015-09-19 06:31:44.000';
          var toTime = '2015-09-23 18:31:44.000';
          var testSubName = 'Dashboard Test 1';

          // .then(function () {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime)
          .then(function sleep() {
            return common.sleep(4000);
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should save and load dashboard', function saveAndLoadDashboard() {
          var testSubName = 'Dashboard Test 1';
// save time on the dashboard?
          return dashboardPage.saveDashboard(testSubName)
          // click New Dashboard just to clear the one we just created
          .then(function () {
            return dashboardPage.clickNewDashboard();
          })
          .then(function () {
            return dashboardPage.loadSavedDashboard(testSubName);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should have all the expected visualizations', function checkVisualizations() {
          return common.tryForTime(10000, function () {
            return dashboardPage.getPanelTitles()
            .then(function (panelTitles) {
              common.log('visualization titles = ' + panelTitles);
              expect(panelTitles).to.eql(visualizations);
            });
          })
          .catch(common.handleError(this));
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
              expect(panelTitles).to.eql(visObjects);
            });
          })
          .catch(common.handleError(this));
        });

      });

    });
  }());
}());
