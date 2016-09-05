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
          common.debug('clickDataTable');
          return visualizePage.clickDataTable();
        })
        .then(function clickNewSearch() {
          common.debug('clickNewSearch');
          return visualizePage.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          common.debug('Bucket = Split Rows');
          return visualizePage.clickBucket('Split Rows');
        })
        .then(function selectAggregation() {
          common.debug('Aggregation = Histogram');
          return visualizePage.selectAggregation('Histogram');
        })
        .then(function selectField() {
          common.debug('Field = bytes');
          return visualizePage.selectField('bytes');
        })
        .then(function setInterval() {
          common.debug('Interval = 2000');
          return visualizePage.setNumericInterval('2000');
        })
        .then(function clickGo() {
          return visualizePage.clickGo();
        })
        .then(function () {
          return headerPage.getSpinnerDone();
        })
        .catch(common.handleError(this));
      });


      bdd.describe('data table', function indexPatternCreation() {
        var testSubName = 'DataTable';
        var vizName1 = 'Visualization ' + testSubName;

        bdd.it('should be able to save and load', function pageHeader() {
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
            return visualizePage.waitForVisualization();
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show correct data, take screenshot', function pageHeader() {
          var chartHeight = 0;
          var expectedChartData = [ '0 2,088', '2,000 2,748', '4,000 2,707', '6,000 2,876',
          '8,000 2,863', '10,000 147', '12,000 148', '14,000 129', '16,000 161', '18,000 137'
          ];

          return visualizePage.getDataTableData()
          .then(function showData(data) {
            common.debug(data.split('\n'));
            expect(data.split('\n')).to.eql(expectedChartData);
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
