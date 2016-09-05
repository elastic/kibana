define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/discover_page');
  var VisualizePage = require('../../../support/pages/visualize_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('visualize app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var visualizePage;
      var fromTime;
      var toTime;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        fromTime = '2015-09-19 06:31:44.000';
        toTime = '2015-09-23 18:31:44.000';

        return scenarioManager.reload('emptyKibana')
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
        })
        .then(function () {
          common.debug('navigateToApp visualize');
          return common.navigateToApp('visualize');
        })
        .then(function () {
          common.debug('clickVerticalBarChart');
          return visualizePage.clickVerticalBarChart();
        })
        .then(function clickNewSearch() {
          return visualizePage.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
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
        .then(function waitForVisualization() {
          return visualizePage.waitForVisualization();
        });
      });

      bdd.describe('vertical bar chart', function indexPatternCreation() {
        var testSubName = 'VerticalBarChart';
        var vizName1 = 'Visualization ' + testSubName;


        bdd.it('should save and load', function pageHeader() {
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
          .then(function () {
            return headerPage.getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function waitForVisualization() {
            return visualizePage.waitForVisualization();
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show correct chart, take screenshot', function pageHeader() {

          var expectedChartValues = [37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
            1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29
          ];

          // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
          // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
          // try sleeping a bit before getting that data
          return common.sleep(5000)
          .then(function () {
            return visualizePage.getBarChartData();
          })
          .then(function showData(data) {
            common.debug('data=' + data);
            common.debug('data.length=' + data.length);
            expect(data).to.eql(expectedChartValues);
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show correct data', function pageHeader() {

          var testSubName = 'VerticalBarChart';
          // this is only the first page of the tabular data.
          var expectedChartData =  [ 'September 20th 2015, 00:00:00.000 37',
            'September 20th 2015, 03:00:00.000 202',
            'September 20th 2015, 06:00:00.000 740',
            'September 20th 2015, 09:00:00.000 1,437',
            'September 20th 2015, 12:00:00.000 1,371',
            'September 20th 2015, 15:00:00.000 751',
            'September 20th 2015, 18:00:00.000 188',
            'September 20th 2015, 21:00:00.000 31',
            'September 21st 2015, 00:00:00.000 42',
            'September 21st 2015, 03:00:00.000 202'
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



      });
    });
  };
});
