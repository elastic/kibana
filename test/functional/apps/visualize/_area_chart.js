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

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        remote = this.remote;
      });

      bdd.before(function () {
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
          common.debug('navigateToApp visualize');
          return common.navigateToApp('visualize');
        })
        .then(function () {
          return common.sleep(2000);
        })
        .then(function () {
          common.debug('clickAreaChart');
          return visualizePage.clickAreaChart();
        })
        .then(function clickNewSearch() {
          common.debug('clickNewSearch');
          return visualizePage.clickNewSearch();
        })
        .then(function clickTimepicker() {
          common.debug('clickTimepicker');
          return common.tryForTime(5000, function () {
            return headerPage.clickTimepicker();
          });
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
          common.debug('Click X-Axis');
          return visualizePage.clickBucket('X-Axis');
        })
        .then(function selectAggregation() {
          common.debug('Click Date Histogram');
          return visualizePage.selectAggregation('Date Histogram');
        })
        .then(function getField() {
          common.debug('Check field value');
          return visualizePage.getField();
        })
        .then(function (fieldValue) {
          common.debug('fieldValue = ' + fieldValue);
          expect(fieldValue).to.be('@timestamp');
        })
        .then(function getInterval() {
          return visualizePage.getInterval();
        })
        .then(function (intervalValue) {
          common.debug('intervalValue = ' + intervalValue);
          expect(intervalValue).to.be('Auto');
        })
        .then(function clickGo() {
          return visualizePage.clickGo();
        })
        .then(function getSpinnerDone() {
          common.debug('Waiting...');
          return headerPage.getSpinnerDone();
        });
      });

      bdd.describe('area charts', function indexPatternCreation() {

        bdd.it('should save and load, take screenshot', function pageHeader() {

          var testSubName = 'AreaChart';
          var vizName1 = 'Visualization ' + testSubName;
          this.timeout = 60000;

          return visualizePage.saveVisualization(vizName1)
          .then(function (message) {
            common.debug('Saved viz message = ' + message);
            expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage.waitForToastMessageGone();
          })
          .then(function loadSavedVisualization() {
            return visualizePage.loadSavedVisualization(vizName1);
          })
          .then(function getSpinnerDone() {
            common.debug('Waiting...');
            return headerPage.getSpinnerDone();
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show correct data', function pageHeader() {

          this.timeout = 60000;

          var expectedTableData = ['September 19th 2015, 18:00:00.000 15',
          'September 19th 2015, 21:00:00.000 105', 'September 20th 2015, 00:00:00.000 518',
          'September 20th 2015, 03:00:00.000 1,261', 'September 20th 2015, 06:00:00.000 1,485',
          'September 20th 2015, 09:00:00.000 982', 'September 20th 2015, 12:00:00.000 322',
          'September 20th 2015, 15:00:00.000 65', 'September 20th 2015, 18:00:00.000 29',
          'September 20th 2015, 21:00:00.000 104', 'September 21st 2015, 00:00:00.000 483',
          'September 21st 2015, 03:00:00.000 1,163', 'September 21st 2015, 06:00:00.000 1,507',
          'September 21st 2015, 09:00:00.000 958', 'September 21st 2015, 12:00:00.000 317',
          'September 21st 2015, 15:00:00.000 55', 'September 21st 2015, 18:00:00.000 17',
          'September 21st 2015, 21:00:00.000 88', 'September 22nd 2015, 00:00:00.000 498',
          'September 22nd 2015, 03:00:00.000 1,209', 'September 22nd 2015, 06:00:00.000 1,488',
          'September 22nd 2015, 09:00:00.000 949', 'September 22nd 2015, 12:00:00.000 308',
          'September 22nd 2015, 15:00:00.000 74', 'September 22nd 2015, 18:00:00.000 4'
          ];

          return visualizePage.collapseChart()
          .then(function setPageSize() {
            return settingsPage.setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage.getDataTableData();
          })
          .then(function showData(data) {
            common.debug('getDataTableData = ' + data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedTableData);
          })
          .then(function collapseChart() {
            return visualizePage.collapseChart();
          })
          .then(function sleep() {
            return common.sleep(2000);
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show correct chart', function pageHeader() {

          this.timeout = 60000;

          var chartHeight = 0;
          var xAxisLabels = ['2015-09-19 19:00', '2015-09-20 19:00', '2015-09-21 19:00', '2015-09-22 19:00'];
          var yAxisLabels = ['0','200','400','600','800','1,000','1,200','1,400','1,600'];
          var expectedAreaChartData = [15, 105, 518, 1261, 1485, 982, 322, 65, 29,
            104, 483, 1163, 1507, 958, 317, 55, 17, 88, 498, 1209, 1488, 949, 308, 74, 4
          ];

          return visualizePage.getXAxisLabels()
          .then(function (labels) {
            common.debug('X-Axis labels = ' + labels);
            expect(labels).to.eql(xAxisLabels);
          })
          .then(function getYAxisLabels() {
            return visualizePage.getYAxisLabels();
          })
          .then(function (labels) {
            common.debug('Y-Axis labels = ' + labels);
            expect(labels).to.eql(yAxisLabels);
          })
          .then(function getAreaChartData() {
            //return common.tryForTime(500, function () {
            return visualizePage.getAreaChartData();
          })
          .then(function (paths) {
            common.debug('expectedAreaChartData = ' + expectedAreaChartData);
            common.debug('actual chart data =     ' + paths);
            expect(paths).to.eql(expectedAreaChartData);
          })
          .catch(common.handleError(this));
        });

      });
    });
  };
});
