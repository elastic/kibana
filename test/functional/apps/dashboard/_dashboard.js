define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var DashboardPage = require('../../../support/pages/dashboard_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('dashboard app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var dashboardPage;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        dashboardPage = new DashboardPage(this.remote);

        common.debug('navigateToApp dashboard');
        return scenarioManager.reload('emptyKibana')
        // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return scenarioManager.loadIfEmpty('logstashFunctional');
        })
        .then(function () {
          common.debug('Load Kibana index with Visualizations = \n'
          + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
          + ' --input=kibanaVis-mapping.JSON'
          + ' --output=http://localhost:9200/.kibana"  --type=mapping'));
          common.debug('Load Kibana index with Visualizations = \n'
          + common.execCommand('cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
          + ' --input=kibanaVis.JSON'
          + ' --output=http://localhost:9200/.kibana"'));
          return common.navigateToApp('dashboard');
        })
        .catch(common.handleError(this));
      });


      bdd.describe('add visualizations to dashboard', function indexPatternCreation() {
        var visualizations = ['Visualization AreaChart',
          'Visualization DataTable',
          'Visualization LineChart',
          'Visualization PieChart',
          'Visualization TileMap',
          'Visualization VerticalBarChart',
          'Visualization MetricChart'
        ];


        bdd.it('should be able to add visualizations to dashboard', function pageHeader() {

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
            console.log('all done');
          });

        });

        bdd.it('set the timepicker time to that which contains our test data', function pageHeader() {
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

        bdd.it('should save and load dashboard', function pageHeader() {
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

        bdd.it('should have all the expected visualizations', function pageHeader() {
          return common.tryForTime(10000, function () {
            return dashboardPage.getPanelTitles()
            .then(function (panelTitles) {
              common.log('visualization titles = ' + panelTitles);
              expect(panelTitles).to.eql(visualizations);
            });
          })
          .catch(common.handleError(this));
        });

        bdd.it('should have all the expected initial sizes', function pageHeader() {
          var visObjects = [ { dataCol: '1', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization AreaChart' },
            { dataCol: '4', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization DataTable' },
            { dataCol: '7', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization LineChart' },
            { dataCol: '10', dataRow: '1', dataSizeX: '3', dataSizeY: '2', title: 'Visualization PieChart' },
            { dataCol: '1', dataRow: '3', dataSizeX: '3', dataSizeY: '2', title: 'Visualization TileMap' },
            { dataCol: '4', dataRow: '3', dataSizeX: '3', dataSizeY: '2', title: 'Visualization VerticalBarChart' },
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
  };
});
