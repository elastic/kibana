/*
* Each of these tests selects a different one of the 8 chart visualization chart types.
'Area chart', 'Data table', 'Line chart', 'Markdown widget', 'Metric', 'Pie chart', 'Tile map', 'Vertical bar chart'

* They use each of the different aggregation types;
 'Date Histogram', 'Histogram', 'Terms' (depends on the chart type).


*/

define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  var ScenarioManager = require('intern/dojo/node!../fixtures/scenarioManager');
  var fs = require('intern/dojo/node!fs');
  //var pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');
  var Common = require('../support/pages/Common');
  var SettingsPage = require('../support/pages/SettingsPage');
  var HeaderPage = require('../support/pages/HeaderPage');
  var DiscoverPage = require('../support/pages/DiscoverPage');
  var VisualizePage = require('../support/pages/VisualizePage');
  // var Promise = require('bluebird');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');

  registerSuite(function () {
    var common;
    var settingsPage;
    var headerPage;
    var visualizePage;
    var discoverPage;
    var scenarioManager;
    var fromTime = '2015-09-20 06:31:44.000';
    var toTime = '2015-09-21 18:31:44.000';
    //var url = 'http://localhost:5601';
    // inverted timestamp makes loading saved items much easier in paginated lists

    return {
      setup: function () {
        var self = this;
        // curl -XDELETE http://localhost:9200/.kibana
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        headerPage = new HeaderPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        scenarioManager = new ScenarioManager(url.format(config.elasticsearch));

        common.log('testVisualize Setup');

        return common
          .sleep(1000)
          .then(function () {
            return scenarioManager
              .unload('emptyKibana');
          })
          .then(function () {
            return common
              .sleep(2000);
          })
          .then(function () {
            return scenarioManager
              .load('emptyKibana');
          })
          .then(function () {
            return scenarioManager
              .loadIfEmpty('logstashFunctional');
          })
          .then(function () {
            return common
              .sleep(2000);
          })
          .then(function () {
            return self.remote
              .get(url.format(_.assign(config.kibana, {
                pathname: ''
              })))
              .setWindowSize(1011, 800);
          })
          // Here we can handle the situation if a default index exists or not
          // If it do exist, we'll be on the Discover tab when Kibana opens.

        .then(function selectTimeFieldOption() {
          return settingsPage
            .selectTimeFieldOption('@timestamp')
            .then(function clickCreateButton() {
              common.log('Found @timestamp on Settings page so we need to create a default index pattern');
              return settingsPage
                .clickCreateButton()
                .then(function clickDefaultIndexButton() {
                  return settingsPage
                    .clickDefaultIndexButton();
                });
            })
            .catch(function (reason) {
              common.log('We already have a default index so skip setting one');
              return;
            });
        });
      },


      'testAreaChartVisualization': function () {
        var testSubName = 'AreaChart';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;

        var expectedChartTypeCount = 8;
        var chartHeight = 0;
        var expectedChartTypes = [
          'Area chart', 'Data table', 'Line chart', 'Markdown widget',
          'Metric', 'Pie chart', 'Tile map', 'Vertical bar chart'
        ];
        var vizName1 = timestamp + ' Visualization Area Chart';
        // these labels could change depending on the window size?
        var xAxisLabels = ['10:00', '13:00', '16:00', '19:00', '22:00', '01:00', '04:00',
          '07:00', '10:00', '13:00', '16:00'
        ];
        var yAxisLabels = ['0', '50', '100', '150', '200', '250', '300'];
        var expectedAreaChartData = [254, 282, 240, 247, 199, 231, 172, 181, 140, 139, 119, 83, 89, 50, 45,
          20, 35, 25, 13, 11, 13, 2, 1, 3, 1, 7, 4, 6, 8, 5, 12, 13, 25, 34, 15, 49, 66, 78, 74, 105, 111,
          151, 164, 196, 206, 211, 235, 272, 241, 258, 262, 234, 240, 228, 193, 158, 149, 122, 108, 89,
          81, 52, 47, 19, 29, 13, 17, 7, 8, 8, 2, 2
        ];

        var expectedTableData = ['September 20th 2015, 06:30:00.000 254', 'September 20th 2015, 07:00:00.000 282',
          'September 20th 2015, 07:30:00.000 240', 'September 20th 2015, 08:00:00.000 247', 'September 20th 2015, 08:30:00.000 199',
          'September 20th 2015, 09:00:00.000 231', 'September 20th 2015, 09:30:00.000 172', 'September 20th 2015, 10:00:00.000 181',
          'September 20th 2015, 10:30:00.000 140', 'September 20th 2015, 11:00:00.000 139', 'September 20th 2015, 11:30:00.000 119',
          'September 20th 2015, 12:00:00.000 83', 'September 20th 2015, 12:30:00.000 89', 'September 20th 2015, 13:00:00.000 50',
          'September 20th 2015, 13:30:00.000 45', 'September 20th 2015, 14:00:00.000 20', 'September 20th 2015, 14:30:00.000 35',
          'September 20th 2015, 15:00:00.000 25', 'September 20th 2015, 15:30:00.000 13', 'September 20th 2015, 16:00:00.000 11',
          'September 20th 2015, 16:30:00.000 13', 'September 20th 2015, 17:00:00.000 2', 'September 20th 2015, 17:30:00.000 1',
          'September 20th 2015, 18:00:00.000 3', 'September 20th 2015, 18:30:00.000 1', 'September 20th 2015, 19:00:00.000 7',
          'September 20th 2015, 19:30:00.000 4', 'September 20th 2015, 20:00:00.000 6', 'September 20th 2015, 20:30:00.000 8',
          'September 20th 2015, 21:00:00.000 5', 'September 20th 2015, 21:30:00.000 12', 'September 20th 2015, 22:00:00.000 13',
          'September 20th 2015, 22:30:00.000 25', 'September 20th 2015, 23:00:00.000 34', 'September 20th 2015, 23:30:00.000 15',
          'September 21st 2015, 00:00:00.000 49', 'September 21st 2015, 00:30:00.000 66', 'September 21st 2015, 01:00:00.000 78',
          'September 21st 2015, 01:30:00.000 74', 'September 21st 2015, 02:00:00.000 105', 'September 21st 2015, 02:30:00.000 111',
          'September 21st 2015, 03:00:00.000 151', 'September 21st 2015, 03:30:00.000 164', 'September 21st 2015, 04:00:00.000 196',
          'September 21st 2015, 04:30:00.000 206', 'September 21st 2015, 05:00:00.000 211', 'September 21st 2015, 05:30:00.000 235',
          'September 21st 2015, 06:00:00.000 272', 'September 21st 2015, 06:30:00.000 241', 'September 21st 2015, 07:00:00.000 258',
          'September 21st 2015, 07:30:00.000 262', 'September 21st 2015, 08:00:00.000 234', 'September 21st 2015, 08:30:00.000 240',
          'September 21st 2015, 09:00:00.000 228', 'September 21st 2015, 09:30:00.000 193', 'September 21st 2015, 10:00:00.000 158',
          'September 21st 2015, 10:30:00.000 149', 'September 21st 2015, 11:00:00.000 122', 'September 21st 2015, 11:30:00.000 108',
          'September 21st 2015, 12:00:00.000 89', 'September 21st 2015, 12:30:00.000 81', 'September 21st 2015, 13:00:00.000 52',
          'September 21st 2015, 13:30:00.000 47', 'September 21st 2015, 14:00:00.000 19', 'September 21st 2015, 14:30:00.000 29',
          'September 21st 2015, 15:00:00.000 13', 'September 21st 2015, 15:30:00.000 17', 'September 21st 2015, 16:00:00.000 7',
          'September 21st 2015, 16:30:00.000 8', 'September 21st 2015, 17:00:00.000 8', 'September 21st 2015, 17:30:00.000 2',
          'September 21st 2015, 18:00:00.000 2'
        ];


        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .setWindowSize(1011, 800)
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          // find all the chart types and make sure there all there
          .then(function getChartTypeCount() {
            return visualizePage
              .getChartTypeCount()
              .then(function verifyChartTypeCount(chartTypeCount) {
                common.log('chartTypeCount = ' + chartTypeCount + ' Expected = ' + expectedChartTypeCount);
                expect(chartTypeCount).to.be(expectedChartTypeCount);
              });
          })
          .then(function getChartTypes() {
            return visualizePage
              .getChartTypes()
              .then(function testChartTypes(chartTypes) {
                common.log('returned chart types = ' + chartTypes);
                common.log('expected chart types = ' + expectedChartTypes);
                expect(chartTypes).to.eql(expectedChartTypes);
              });
          })

        // Here's a variation in behavior depending on whether or not there is an
        // existing visualization (saved or not saved?).
        // If there is no vis, you get the chart type selection.
        // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
          return visualizePage
            .clickNewVisualization()
            .then(function () {
              common.log('We found and clicked on the New Visualization button so there must be existing vis');
              return;
            })
            .catch(function () {
              common.log('We didn\'t find the New Visualization button so this must be the first');
              return;
            });
        })


        .then(function clickAreaChart() {
            return visualizePage
              .clickAreaChart();
          })
          .then(function clickNewSearch() {
            return visualizePage
              .clickNewSearch();
          })
          .then(function clickTimepicker() {
            return common.tryForTime(5000, function () {
              return discoverPage
                .clickTimepicker();
            });
          })

        .then(function setAbsoluteRange() {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function collapseTimepicker() {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          /////////////////
          .then(function () {
            return visualizePage
              .getErrorMessage()
              .then(function (message) {
                common.log('message = ' + message);
                expect(message).to.be('Area charts require more than one data point. Try adding an X-Axis Aggregation');
              });
          })
          .then(function clickBucket() {
            common.log('Click X-Axis');
            return visualizePage
              .clickBucket('X-Axis');
          })
          .then(function selectAggregation() {
            common.log('Click Date Histogram');
            return visualizePage
              .selectAggregation('Date Histogram');
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone();
          })
          .then(function getField() {
            common.log('Check field value');
            return visualizePage
              .getField()
              .then(function (fieldValue) {
                common.log('fieldValue = ' + fieldValue);
                expect(fieldValue).to.be('@timestamp');
              });
          })
          .then(function getInterval() {
            return visualizePage
              .getInterval()
              .then(function (intervalValue) {
                common.log('intervalValue = ' + intervalValue);
                expect(intervalValue).to.be('Auto');
              });
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function saveVisualization() {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          .then(function loadSavedVisualization() {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          .then(function getXAxisLabels() {
            return visualizePage
              .getXAxisLabels()
              .then(function (labels) {
                common.log('X-Axis labels = ' + labels);
                expect(labels).to.eql(xAxisLabels);
              });
          })
          .then(function getYAxisLabels() {
            return visualizePage
              .getYAxisLabels()
              .then(function (labels) {
                common.log('Y-Axis labels = ' + labels);
                expect(labels).to.eql(yAxisLabels);
              });
          })
          // before we get the points on the chart, lets get the data below it and change that
          .then(function collapseChart() {
            return visualizePage
              .collapseChart();
          })
          .then(function setPageSize() {
            return settingsPage
              .setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.trim().split('\n')).to.eql(expectedTableData);
              });
          })
          // expandChart (toggle)
          .then(function collapseChart() {
            return visualizePage
              .collapseChart();
          })
          .then(function sleep() {
            return common
              .sleep(500);
          })
          .then(function getAreaChartData() {
            //return common.tryForTime(500, function () {
            return visualizePage
              .getAreaChartData()
              .then(function (paths) {
                expect(paths).to.eql(expectedAreaChartData);
              });
            //});
          })
          .catch(function screenshotError(reason) {
            common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
            return remote
              .takeScreenshot()
              .then(function screenshot2a(data) {
                fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                throw new Error(reason);
              });
          });
      },


      'testDataTableVisualization': function () {
        var testSubName = 'DataTable';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;

        var expectedChartTypeCount = 8;
        var chartHeight = 0;
        var vizName2 = timestamp + ' Visualization Data Table';
        var expectedChartData = ['0 1,063', '2,000 1,422', '4,000 1,408', '6,000 1,477',
          '8,000 1,471', '10,000 82', '12,000 76', '14,000 66', '16,000 78', '18,000 66'
        ];

        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          // Here's a variation in behavior depending on whether or not there is an
          // existing visualization (saved or not saved?).
          // If there is no vis, you get the chart type selection.
          // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
            return visualizePage
              .clickNewVisualization()
              .then(function () {
                common.log('We found and clicked on the New Visualization button so there must be existing vis');
                return;
              })
              .catch(function () {
                common.log('We didn\'t find the New Visualization button so this must be the first');
                return;
              });
          })
          .then(function clickDataTable() {
            common.log('Click Data Table');
            return visualizePage
              .clickDataTable();
          })
          .then(function clickNewSearch() {
            return visualizePage
              .clickNewSearch();
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickTimepicker() {
            common.log('Click time picker');
            return discoverPage
              .clickTimepicker();
          })
          .then(function setAbsoluteRange() {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function collapseTimepicker() {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          .then(function clickBucket() {
            common.log('Bucket = Split Rows');
            return visualizePage
              .clickBucket('Split Rows');
          })
          .then(function selectAggregation() {
            common.log('Aggregation = Histogram');
            return visualizePage
              .selectAggregation('Histogram');
          })
          .then(function selectField() {
            common.log('Field = bytes');
            return visualizePage
              .selectField('bytes');
          })
          .then(function setInterval() {
            common.log('Interval = 2000');
            return visualizePage
              .setNumericInterval('2000');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function saveVisualization() {
            return visualizePage
              .saveVisualization(vizName2)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName2 + '\"');
              });
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.split('\n')).to.eql(expectedChartData);
              });
          })
          .catch(function screenshotError(reason) {
            common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
            return remote
              .takeScreenshot()
              .then(function screenshot2a(data) {
                fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                throw new Error(reason);
              });
          });
      },


      'testLineChartVisualization': function () {

        var testSubName = 'LineChart';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;

        var expectedChartData = ['jpg 4,683', 'css 1,106', 'png 701', 'gif 494', 'php 225'];

        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          // Here's a variation in behavior depending on whether or not there is an
          // existing visualization (saved or not saved?).
          // If there is no vis, you get the chart type selection.
          // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
            return visualizePage
              .clickNewVisualization()
              .then(function () {
                common.log('We found and clicked on the New Visualization button so there must be existing vis');
                return;
              })
              .catch(function () {
                common.log('We didn\'t find the New Visualization button so this must be the first');
                return;
              });
          })
          .then(function clickDataTable() {
            return visualizePage
              .clickLineChart();
          })
          .then(function clickNewSearch() {
            return visualizePage
              .clickNewSearch();
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickTimepicker() {
            common.log('Click time picker');
            return discoverPage
              .clickTimepicker();
          })
          .then(function setAbsoluteRange() {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function collapseTimepicker() {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          .then(function clickBucket() {
            common.log('Bucket = Split Chart');
            return visualizePage
              .clickBucket('Split Chart');
          })
          .then(function selectAggregation() {
            common.log('Aggregation = Terms');
            return visualizePage
              .selectAggregation('Terms');
          })
          .then(function selectField() {
            common.log('Field = metric: Count');
            return visualizePage
              .selectField('extension');
          })
          // Tried multiple times but didn't get this working.  The default is 'metric: Count'
          // .then(function selectField() {
          //   common.log('Field = metric: Count');
          //   return visualizePage
          //   .orderBy('metric: Count');
          // })
          .then(function setInterval() {
            common.log('switch from Rows to Columns');
            return visualizePage
              .clickColumns();
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function saveVisualization() {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          // before we get the points on the chart, lets get the data below it and change that
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.trim().split('\n')).to.eql(expectedChartData);
              });
          })
          // expandChart (toggle)
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function getLineChartData() {
            return visualizePage
              .getLineChartData()
              .then(function showData(data) {
                // common.log(data);

                var tolerance = 50; // the y-axis scale is 5000 so 50 is 1%
                for (var x = 0; x < data.length; x++) {
                  common.log('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
                    (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
                    ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
                  expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
                }
                common.log('Done');
              });
          })
          .catch(function screenshotError(reason) {
            common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
            return remote
              .takeScreenshot()
              .then(function screenshot2a(data) {
                fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                throw new Error(reason);
              });
          });
      },


      'testMetricChartVisualization': function () {

        var testSubName = 'MetricChart';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;

        var expectedCount = ['7,209', 'Count'];
        var avgMachineRam = ['13,109,049,499.121', 'Average machine.ram'];
        var sumPhpMemory = ['45,433,560', 'Sum of phpmemory'];
        var mediamBytes = ['5,565.263', '50th percentile of bytes']; // not consistent
        var minTimestamp = ['September 20th 2015, 06:32:05.110', 'Min @timestamp'];
        var maxRelatedContentArticleModifiedTime = ['April 3rd 2015, 19:54:41.000', 'Max relatedContent.article:modified_time'];
        var standardDeviationBytes = ['-1,399.34', 'Lower Standard Deviation of bytes', '5,720.329',
          'Average of bytes', '12,839.999', 'Upper Standard Deviation of bytes'
        ];
        var uniqueCountClientip = ['998', 'Unique count of clientip'];
        var percentileMachineRam = ['2,147,483,648', '1st percentile of machine.ram', '3,221,225,472',
          '5th percentile of machine.ram', '7,516,192,768', '25th percentile of machine.ram', '12,884,901,888',
          '50th percentile of machine.ram', '18,253,611,008', '75th percentile of machine.ram',
          '32,212,254,720', '95th percentile of machine.ram', '32,212,254,720', '99th percentile of machine.ram'
        ];
        var percentileRankBytes = ['1.36%', 'Percentile rank 99 of "memory"'];

        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          // Here's a variation in behavior depending on whether or not there is an
          // existing visualization (saved or not saved?).
          // If there is no vis, you get the chart type selection.
          // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
            return visualizePage
              .clickNewVisualization()
              .then(function () {
                common.log('We found and clicked on the New Visualization button so there must be existing vis');
                return;
              })
              .catch(function () {
                common.log('We didn\'t find the New Visualization button so this must be the first');
                return;
              });
          })
          .then(function clickDataTable() {
            return visualizePage
              .clickMetric();
          })
          .then(function clickNewSearch() {
            return visualizePage
              .clickNewSearch();
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickTimepicker() {
            common.log('Click time picker');
            return discoverPage
              .clickTimepicker();
          })
          .then(function setAbsoluteRange() {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function collapseTimepicker() {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          // initial metric of "Count" is selected by default
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(expectedCount).to.eql(metricValue.split('\n'));
                });
            });
          })
          .then(function () {
            return visualizePage
              .clickMetricEditor();
          })
          ///////////////////// Average machine.ram
          .then(function selectAggregation() {
            common.log('Aggregation = Average');
            return visualizePage
              .selectAggregation('Average');
          })
          .then(function selectField() {
            common.log('Field = machine.ram');
            return visualizePage
              .selectField('machine.ram');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(avgMachineRam).to.eql(metricValue.split('\n'));
                });
            });
          })
          ///////////////////// Sum phpmemory
          .then(function selectAggregation() {
            common.log('Aggregation = Sum');
            return visualizePage
              .selectAggregation('Sum');
          })
          .then(function selectField() {
            common.log('Field = phpmemory');
            return visualizePage
              .selectField('phpmemory');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(sumPhpMemory).to.eql(metricValue.split('\n'));
                });
            });
          })
          ///////////////////// mediam bytes - not consistent?  Also tried phpmemory
          // Maybe some other metric would give consistent results?
          //  For now, only comparing the text label part of the metric
          .then(function selectAggregation() {
            common.log('Aggregation = Median');
            return visualizePage
              .selectAggregation('Median');
          })
          .then(function selectField() {
            common.log('Field = bytes');
            return visualizePage
              .selectField('bytes');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  // only comparing the text label!
                  expect(mediamBytes[1]).to.eql(metricValue.split('\n')[1]);
                });
            });
          })
          ///////////////////// Min @timestamp
          .then(function selectAggregation() {
            common.log('Aggregation = Min');
            return visualizePage
              .selectAggregation('Min');
          })
          .then(function selectField() {
            common.log('Field = @timestamp');
            return visualizePage
              .selectField('@timestamp');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(minTimestamp).to.eql(metricValue.split('\n'));
                });
            });
          })
          ///////////////////// Max relatedContent.article:modified_time
          .then(function selectAggregation() {
            common.log('Aggregation = Max');
            return visualizePage
              .selectAggregation('Max');
          })
          .then(function selectField() {
            common.log('Field = relatedContent.article:modified_time');
            return visualizePage
              .selectField('relatedContent.article:modified_time');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(maxRelatedContentArticleModifiedTime).to.eql(metricValue.split('\n'));
                });
            });
          })
          ///////////////////// Standard Deviation bytes
          .then(function selectAggregation() {
            common.log('Aggregation = Standard Deviation');
            return visualizePage
              .selectAggregation('Standard Deviation');
          })
          .then(function selectField() {
            common.log('Field = bytes');
            return visualizePage
              .selectField('bytes');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(standardDeviationBytes).to.eql(metricValue.split('\n'));
                });
            });
          })
          ///////////////////// Unique count of clientip
          .then(function selectAggregation() {
            common.log('Aggregation = Unique Count');
            return visualizePage
              .selectAggregation('Unique Count');
          })
          .then(function selectField() {
            common.log('Field = clientip');
            return visualizePage
              .selectField('clientip');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
                });
            });
          })
          .then(function () {
            return visualizePage
              .getMetric()
              .then(function (metricValue) {
                common.log('metricValue=' + metricValue.split('\n'));
                expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
              });
          })
          ///////////////////// percentile of machine.ram
          .then(function selectAggregation() {
            common.log('Aggregation = Percentiles');
            return visualizePage
              .selectAggregation('Percentiles');
          })
          .then(function selectField() {
            common.log('Field =  machine.ram');
            return visualizePage
              .selectField('machine.ram');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(percentileMachineRam).to.eql(metricValue.split('\n'));
                });
            });
          })
          ///////////////////// Percentile rank 50 of "bytes"
          .then(function selectAggregation() {
            common.log('Aggregation = Percentile Ranks');
            return visualizePage
              .selectAggregation('Percentile Ranks');
          })
          .then(function selectField() {
            common.log('Field =  bytes');
            return visualizePage
              .selectField('memory');
          })
          .then(function selectField() {
            common.log('Values =  99');
            return visualizePage
              .setValue('99');
          })
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return common.tryForTime(2000, function () {
              return visualizePage
                .getMetric()
                .then(function (metricValue) {
                  expect(percentileRankBytes).to.eql(metricValue.split('\n'));
                });
            });
          })
          .then(function saveVisualization() {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          .catch(function screenshotError(reason) {
            common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
            return remote
              .takeScreenshot()
              .then(function screenshot2a(data) {
                fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                throw new Error(reason);
              });
          });
      },


      'testVerticalBarChartVisualization': function () {

        var testSubName = 'VerticalBarChart';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;

        // this is only the first page of the tabular data.
        var expectedChartData = ['September 20th 2015, 06:30:00.000 254',
          'September 20th 2015, 07:00:00.000 282',
          'September 20th 2015, 07:30:00.000 240',
          'September 20th 2015, 08:00:00.000 247',
          'September 20th 2015, 08:30:00.000 199',
          'September 20th 2015, 09:00:00.000 231',
          'September 20th 2015, 09:30:00.000 172',
          'September 20th 2015, 10:00:00.000 181',
          'September 20th 2015, 10:30:00.000 140',
          'September 20th 2015, 11:00:00.000 139'
        ];

        var expectedChartValues = [254, 282, 240, 247, 199, 231, 172, 181, 140, 139, 119, 83, 89, 50, 45, 20,
          35, 25, 13, 11, 13, 2, 1, 3, 1, 7, 4, 6, 8, 5, 12, 13, 25, 34, 15, 49, 66, 78, 74, 105, 111, 151, 164, 196, 206,
          211, 235, 272, 241, 258, 262, 234, 240, 228, 193, 158, 149, 122, 108, 89, 81, 52, 47, 19, 29, 13, 17, 7, 8, 8, 2, 2
        ];

        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickVisualize() {
            return headerPage
              .clickVisualize();
          })
          // Here's a variation in behavior depending on whether or not there is an
          // existing visualization (saved or not saved?).
          // If there is no vis, you get the chart type selection.
          // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
            return visualizePage
              .clickNewVisualization()
              .then(function () {
                common.log('We found and clicked on the New Visualization button so there must be existing vis');
                return;
              })
              .catch(function () {
                common.log('We didn\'t find the New Visualization button so this must be the first');
                return;
              });
          })
          .then(function clickDataTable() {
            return visualizePage
              .clickVerticalBarChart();
          })
          .then(function clickNewSearch() {
            return visualizePage
              .clickNewSearch();
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function clickTimepicker() {
            common.log('Click time picker');
            return discoverPage
              .clickTimepicker();
          })
          .then(function setAbsoluteRange() {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function collapseTimepicker() {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          .then(function clickBucket() {
            common.log('Bucket = X-Axis');
            return visualizePage
              .clickBucket('X-Axis');
          })
          .then(function selectAggregation() {
            common.log('Aggregation = Date Histogram');
            return visualizePage
              .selectAggregation('Date Histogram');
          })
          .then(function selectField() {
            common.log('Field = @timestamp');
            return visualizePage
              .selectField('@timestamp');
          })
          // leaving Interval set to Auto
          .then(function clickGo() {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function saveVisualization() {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          // there shouldn't be any message here
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          // before we get the points on the chart, lets get the data below it and change that
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.trim().split('\n')).to.eql(expectedChartData);
              });
          })
          // expandChart (toggle)
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function getBarChartData() {
            return visualizePage
              .getBarChartData()
              .then(function showData(data) {
                common.log('data=' + data);
                common.log('data.length=' + data.length);
                expect(data).to.eql(expectedChartValues);
                common.log('Done');
              });
          })
          .then(function () {
            return common
              .sleep(2000);
          })
          .catch(function screenshotError(reason) {
            common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
            return remote
              .takeScreenshot()
              .then(function screenshot2a(data) {
                fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                throw new Error(reason);
              });
          });
      },


      'testTileMapVisualization': function () {
        var testSubName = 'TileMap';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;
        var expectedTableData = ['dn 742',
          'dp 723',
          '9y 629',
          '9z 559',
          'dr 525',
          'dj 520',
          '9v 503',
          '9q 370',
          '9w 248',
          'c2 227',
          'cb 225',
          '9x 223',
          'dq 193',
          '9r 188',
          '9t 147',
          'c8 142',
          'dh 113',
          'bd 109',
          'b6 105',
          'b7 88',
          'be 70',
          'f0 69',
          '9m 69',
          'bf 47',
          'de 44',
          'bg 35',
          '9p 35',
          '9u 29',
          'c4 28',
          '8e 25',
          'c1 24',
          'f2 21',
          '87 19',
          'c0 18',
          'bs 18',
          'b3 16',
          'bk 12',
          '84 11',
          'b5 9',
          '8f 8',
          'bu 6',
          'b1 5',
          'dx 4',
          'b4 4',
          '9n 2'
        ];


        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .setWindowSize(1011, 800)
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function () {
            return headerPage
              .clickVisualize();
          })

        // Here's a variation in behavior depending on whether or not there is an
        // existing visualization (saved or not saved?).
        // If there is no vis, you get the chart type selection.
        // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
            return visualizePage
              .clickNewVisualization()
              .then(function () {
                common.log('We found and clicked on the New Visualization button so there must be existing vis');
                return;
              })
              .catch(function () {
                common.log('We didn\'t find the New Visualization button so this must be the first');
                return;
              });
          })
          .then(function () {
            return visualizePage
              .clickTileMap();
          })
          .then(function () {
            return visualizePage
              .clickNewSearch();
          })
          .then(function () {
            return common.tryForTime(5000, function () {
              return discoverPage
                .clickTimepicker();
            });
          })
          .then(function () {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function () {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          .then(function () {
            common.log('select bucket Geo Coordinates');
            return visualizePage
              .clickBucket('Geo Coordinates');
          })
          .then(function () {
            common.log('Click aggregation Geohash');
            return visualizePage
              .selectAggregation('Geohash');
          })
          .then(function () {
            common.log('Click field geo.coordinates');
            return common.tryForTime(1000, function () {
              return visualizePage
                .selectField('geo.coordinates');
            });
          })
          .then(function () {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function () {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          .then(function sleep() {
            return common
              .sleep(500);
          })
          // before we get the points on the chart, lets get the data below it and change that
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function () {
            return settingsPage
              .setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.trim().split('\n')).to.eql(expectedTableData);
              });
          })
          // expandChart (toggle)
          .then(function () {
            return visualizePage
              .collapseChart();
            // })
            // .then(function sleep() {
            //   return common
            //     .sleep(100);
            // })
            // .then(function () {
            //   //return common.tryForTime(500, function () {
            //   return visualizePage
            //     .getTileMapData()
            //     .then(function (mapData) {
            //       common.log('Pie Chart slice data=' + mapData);
            //       //expect(slices).to.eql(expectedAreaChartData);
            //     });
            //});
          })
          .catch(function screenshotError(reason) {
            common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
            return remote
              .takeScreenshot()
              .then(function screenshot2a(data) {
                fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                throw new Error(reason);
              });
          });
      },


      'testPieChartVisualization': function () {
        var testSubName = 'PieChart';
        common.log('Start of test' + testSubName + 'Visualization');
        this.timeout = 60000;
        var timestamp = '__' + (2000000000000 - Date.now());
        var vizName1 = timestamp + ' Visualization ' + testSubName;
        var remote = this.remote;

        var expectedTableData = ['0 23',
          '40,000 22',
          '80,000 23',
          '120,000 23',
          '160,000 19',
          '200,000 24',
          '240,000 21',
          '280,000 22',
          '320,000 20',
          '360,000 28'
        ];

        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function sleep() {
            return common
              .sleep(100);
          })
          .setWindowSize(1011, 800)
          .then(function () {
            return headerPage
              .clickVisualize();
          })

        // Here's a variation in behavior depending on whether or not there is an
        // existing visualization (saved or not saved?).
        // If there is no vis, you get the chart type selection.
        // If there is, you get the existing (or most recent) vis.

        // If the 'New Visualization' button is there, click it,
        //   else, go on to select chart type.
        .then(function () {
            return visualizePage
              .clickNewVisualization()
              .then(function () {
                common.log('We found and clicked on the New Visualization button so there must be existing vis');
                return;
              })
              .catch(function () {
                common.log('We didn\'t find the New Visualization button so this must be the first');
                return;
              });
          })
          .then(function () {
            return visualizePage
              .clickPieChart();
          })
          .then(function () {
            return visualizePage
              .clickNewSearch();
          })
          .then(function () {
            return common.tryForTime(5000, function () {
              return discoverPage
                .clickTimepicker();
            });
          })

        .then(function () {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function () {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          /////////////////
          // .then(function () {
          //   return visualizePage
          //     .getErrorMessage()
          //     .then(function (message) {
          //       common.log('message = ' + message);
          //       expect(message).to.be('Area charts require more than one data point. Try adding an X-Axis Aggregation');
          //     });
          // })
          .then(function () {
            common.log('select bucket Split Slices');
            return visualizePage
              .clickBucket('Split Slices');
          })
          .then(function () {
            common.log('Click aggregation Histogram');
            return visualizePage
              .selectAggregation('Histogram');
          })
          .then(function () {
            common.log('Click field memory');
            return visualizePage
              .selectField('memory');
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone();
          })
          .then(function () {
            return visualizePage
              .setNumericInterval('40000');
          })
          .then(function () {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function () {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                common.log('Saved viz message = ' + message);
                expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return visualizePage
              .waitForToastMessageGone();
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + testSubName + '.png', data);
              });
          })
          .then(function sleep() {
            return common
              .sleep(500);
          })
          // before we get the points on the chart, lets get the data below it and change that
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function () {
            return settingsPage
              .setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.trim().split('\n')).to.eql(expectedTableData);
              });
          })
          // expandChart (toggle)
          .then(function () {
            return visualizePage
              .collapseChart();
          })
          .then(function sleep() {
            return common
              .sleep(500);
          })
          .then(function () {
            //return common.tryForTime(500, function () {
            return visualizePage
              .getPieChartData()
              .then(function (slices) {
                common.log('Pie Chart slice data=' + slices);
                // this logs 13.  There's 12 slices (the last element of the split is empty).
                common.log('Pie Chart typeof(slice)=' + (slices.toString()).split('Z').length);

                //expect(slices).to.eql(expectedAreaChartData);

                // Each slice below has 4 commands;
                // * Move to one of the ends of a slice arc
                // * Arc clickwise(1) to another point
                // * Line to center 0,0
                // * Zclose

                // slices=
                // M1.526981477686856e-14,-249.375
                //   A249.375,249.375 0 0,1 1.7392608661981475,-249.36893470646922
                //   L0,0Z,
                // M1.7392608661981475,-249.36893470646922
                //   A249.375,249.375 0 0,1 38.75851337184286,-246.34461282156076
                //   L0,0Z,
                // M38.75851337184286,-246.34461282156076
                //   A249.375,249.375 0 0,1 88.47259401416454,-233.1533631183664
                //   L0,0Z,
                // M88.47259401416454,-233.1533631183664
                //   A249.375,249.375 0 0,1 116.20119793670887,-220.64716681406497
                //   L0,0Z,
                // M116.20119793670887,-220.64716681406497
                //   A249.375,249.375 0 0,1 131.48011654525644,-211.89825289097072
                //   L0,0Z,
                // M131.48011654525644,-211.89825289097072
                //   A249.375,249.375 0 0,1 185.912174295682,-166.20635990735116
                //   L0,0Z,
                // M185.912174295682,-166.20635990735116
                //   A249.375,249.375 0 0,1 247.9484003980758,-26.63609139936818
                //   L0,0Z,
                // M247.9484003980758,-26.63609139936818
                //   A249.375,249.375 0 0,1 223.7787036397108,110.04990877929197
                //   L0,0Z,
                // M223.7787036397108,110.04990877929197
                //   A249.375,249.375 0 0,1 -97.64922270251822,229.46136914651672
                //   L0,0Z,
                // M-97.64922270251822,229.46136914651672
                //   A249.375,249.375 0 0,1 -206.364967580836,-140.0049669846056
                //   L0,0Z,
                // M-206.364967580836,-140.0049669846056
                //   A249.375,249.375 0 0,1 -27.77067802839771,-247.82388921740994
                //   L0,0Z,
                // M-27.77067802839771,-247.82388921740994
                //   A249.375,249.375 0 0,1 -4.5809444330605675e-14,-249.375
                //   L0,0Z

              })
              .then(function () {
                return common
                  .sleep(2000);
              })
              .catch(function screenshotError(reason) {
                common.log('Test Failed, taking screenshot "./screenshot-' + testSubName + '-ERROR- + Date.now() + .png"');
                return remote
                  .takeScreenshot()
                  .then(function screenshot2a(data) {
                    fs.writeFileSync('./screenshot-' + testSubName + '-ERROR-' + Date.now() + '.png', data);
                    throw new Error(reason);
                  });
              });
          });
      }

    };
  });
});
