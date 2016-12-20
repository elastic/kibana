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
      //var remote;

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
          common.debug('clickLineChart');
          return visualizePage.clickLineChart();
        })
        .then(function clickNewSearch() {
          return visualizePage.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          common.debug('Bucket = Split Chart');
          return visualizePage.clickBucket('Split Chart');
        })
        .then(function selectAggregation() {
          common.debug('Aggregation = Terms');
          return visualizePage.selectAggregation('Terms');
        })
        .then(function selectField() {
          common.debug('Field = extension');
          return visualizePage.selectField('extension');
        })
        .then(function setInterval() {
          common.debug('switch from Rows to Columns');
          return visualizePage.clickColumns();
        })
        .then(function clickGo() {
          return visualizePage.clickGo();
        })
        .then(function () {
          return headerPage.getSpinnerDone(); // only matches the hidden spinner
        })
        .catch(common.handleError(this));
      });

      bdd.describe('line charts', function indexPatternCreation() {
        var testSubName = 'LineChart';
        var vizName1 = 'Visualization ' + testSubName;

        bdd.it('should show correct chart, take screenshot', function pageHeader() {

          // this test only verifies the numerical part of this data
          // it could also check the legend to verify the extensions
          var expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

          // sleep a bit before trying to get the chart data
          return common.sleep(3000)
          .then(function () {
            return visualizePage.getLineChartData()
            .then(function showData(data) {
              var tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
              for (var x = 0; x < data.length; x++) {
                common.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
                  (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
                  ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
                expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
              }
              common.debug('Done');
            });
          })
          .then(function takeScreenshot() {
            // take a snapshot just as an example.
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct chart order by Term', function pageHeader() {

          // this test only verifies the numerical part of this data
          // https://github.com/elastic/kibana/issues/8141
          var expectedChartData = ['png 1,373', 'php 445', 'jpg 9,109', 'gif 918', 'css 2,159'];

          common.debug('Order By = Term');
          return visualizePage.selectOrderBy('_term')
          .then(function () {
            return common.sleep(1000);
          })
          .then(function clickGo() {
            return visualizePage.clickGo();
          })
          .then(function () {
            return common.sleep(1000);
          })
          .then(function () {
            return visualizePage.getLineChartData('fill="#57c17b"')
            .then(function showData(data) {
              common.debug('data=' + data);
              common.saveScreenshot('Visualize-line-chart');
              var tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
              for (var x = 0; x < data.length; x++) {
                common.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
                  (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
                  ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
                expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
              }
              common.debug('Done');
            });
          });
        });


        bdd.it('should show correct data, ordered by Term', function pageHeader() {

          var expectedChartData = ['png 1,373', 'php 445', 'jpg 9,109', 'gif 918', 'css 2,159'];

          return visualizePage.collapseChart()
          .then(function getDataTableData() {
            return visualizePage.getDataTableData();
          })
          .then(function showData(data) {
            common.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedChartData);
          })
          .catch(common.handleError(this));
        });


        bdd.it('should be able to save and load', function pageHeader() {

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
          .catch(common.handleError(this));
        });

      });
    });
  };
});
