define(function (require) {
  var Common = require('../../../support/pages/Common');
  var HeaderPage = require('../../../support/pages/HeaderPage');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var DiscoverPage = require('../../../support/pages/DiscoverPage');
  var VisualizePage = require('../../../support/pages/VisualizePage');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('visualize app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var visualizePage;
      var remote;
      var fromTime;
      var toTime;

      bdd.beforeEach(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        remote = this.remote;
        fromTime = '2015-09-19 06:31:44.000';
        toTime = '2015-09-23 18:31:44.000';

        return visualizePage.clickVerticalBarChart()
        .then(function clickNewSearch() {
          return visualizePage.clickNewSearch();
        })
        .then(function sleep() {
          return common.sleep(1000);
        })
        .then(function clickTimepicker() {
          common.debug('Click time picker');
          return discoverPage.clickTimepicker();
        })
        .then(function setAbsoluteRange() {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function collapseTimepicker() {
          common.debug('Collapse Time Picker pane');
          return headerPage.collapseTimepicker();
        })
        .then(function clickBucket() {
          common.debug('Bucket = X-Axis');
          return visualizePage.clickBucket('X-Axis');
        })
        .then(function selectAggregation() {
          common.debug('Aggregation = Date Histogram');
          return visualizePage.selectAggregation('Date Histogram');
        })
        .then(function selectField() {
          common.debug('Field = @timestamp');
          return visualizePage.selectField('@timestamp');
        })
        // leaving Interval set to Auto
        .then(function clickGo() {
          return visualizePage.clickGo();
        })
        .then(function () {
          return headerPage.getSpinnerDone(); // only matches the hidden spinner
        })
        .then(function sleep() {
          return common.sleep(1000);
        });
      });

      bdd.describe('vertical bar chart', function indexPatternCreation() {


        bdd.it('should save and load, take screenshot', function pageHeader() {

          var testSubName = 'VerticalBarChart';
          common.debug('Start of test' + testSubName + 'Visualization');
          this.timeout = 60000;
          var vizName1 = 'Visualization ' + testSubName;
          var remote = this.remote;

          return visualizePage.saveVisualization(vizName1)
          .then(function (message) {
            common.debug('Saved viz message = ' + message);
            expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage.waitForToastMessageGone();
          })
          .then(function () {
            return visualizePage.loadSavedVisualization(vizName1);
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });



        bdd.it('should show correct data', function pageHeader() {

          var testSubName = 'VerticalBarChart';
          this.timeout = 60000;

          // this is only the first page of the tabular data.
          var expectedChartData =  [ 'September 19th 2015, 18:00:00.000 15',
            'September 19th 2015, 21:00:00.000 105',
            'September 20th 2015, 00:00:00.000 518',
            'September 20th 2015, 03:00:00.000 1,261',
            'September 20th 2015, 06:00:00.000 1,485',
            'September 20th 2015, 09:00:00.000 982',
            'September 20th 2015, 12:00:00.000 322',
            'September 20th 2015, 15:00:00.000 65',
            'September 20th 2015, 18:00:00.000 29',
            'September 20th 2015, 21:00:00.000 104'
          ];

          return visualizePage.collapseChart()
          .then(function showData(data) {
            return visualizePage.getDataTableData();
          })
          .then(function showData(data) {
            common.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedChartData);
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show correct chart', function pageHeader() {

          this.timeout = 60000;
          var expectedChartValues = [15, 105, 518, 1261, 1485, 982, 322, 65, 29, 104,
            483, 1163, 1507, 958, 317, 55, 17, 88, 498, 1209, 1488, 949, 308, 74, 4
          ];

          return visualizePage.getBarChartData()
          .then(function showData(data) {
            common.debug('data=' + data);
            common.debug('data.length=' + data.length);
            expect(data).to.eql(expectedChartValues);
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
