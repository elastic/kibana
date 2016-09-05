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

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

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
          common.debug('clickPieChart');
          return visualizePage.clickPieChart();
        })
        .then(function clickNewSearch() {
          return visualizePage.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          common.debug('select bucket Split Slices');
          return visualizePage.clickBucket('Split Slices');
        })
        .then(function () {
          common.debug('Click aggregation Histogram');
          return visualizePage.selectAggregation('Histogram');
        })
        .then(function () {
          common.debug('Click field memory');
          return visualizePage.selectField('memory');
        })
        .then(function () {
          return headerPage.getSpinnerDone();
        })
        .then(function sleep() {
          return common.sleep(1003);
        })
        .then(function () {
          common.debug('setNumericInterval 4000');
          return visualizePage.setNumericInterval('40000');
        })
        .then(function () {
          common.debug('clickGo');
          return visualizePage.clickGo();
        })
        .then(function () {
          return headerPage.getSpinnerDone();
        });
      });


      bdd.describe('pie chart', function indexPatternCreation() {
        var testSubName = 'PieChart';
        var vizName1 = 'Visualization ' + testSubName;


        bdd.it('should save and load', function pageHeader() {
          common.debug('Start of test' + testSubName + 'Visualization');

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
          .then(function waitForVisualization() {
            return visualizePage.waitForVisualization();
          })
          // sleep a bit before trying to get the pie chart data below
          .then(function sleep() {
            return common.sleep(2000);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show 10 slices in pie chart, take screenshot', function pageHeader() {
          var expectedPieChartSliceCount = 10;

          return visualizePage.getPieChartData()
          .then(function (pieData) {
            var barHeightTolerance = 1;
            common.debug('pieData.length = ' + pieData.length);
            expect(pieData.length).to.be(expectedPieChartSliceCount);
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data', function pageHeader() {
          var expectedTableData =  [ '0 55', '40,000 50', '80,000 41', '120,000 43',
            '160,000 44', '200,000 40', '240,000 46', '280,000 39', '320,000 40', '360,000 47'
          ];

          return visualizePage.collapseChart()
          .then(function () {
            return settingsPage.setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage.getDataTableData();
          })
          .then(function showData(data) {
            common.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedTableData);
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
