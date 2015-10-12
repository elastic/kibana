/*
* Each of these tests selects a different one of the 8 chart visualization chart types.
'Area chart', 'Data table', 'Line chart', 'Markdown widget', 'Metric', 'Pie chart', 'Tile map', 'Vertical bar chart'

* They use each of the different aggregation types;
 'Date Histogram', 'Histogram', 'Terms' (depends on the chart type).


*/

define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  //var ScenarioManager = require('intern/dojo/node!../fixtures/scenarioManager');
  var fs = require('intern/dojo/node!fs');
  var pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');
  var Common = require('../support/pages/Common');
  var SettingsPage = require('../support/pages/SettingsPage');
  var HeaderPage = require('../support/pages/HeaderPage');
  var DiscoverPage = require('../support/pages/DiscoverPage');
  var VisualizePage = require('../support/pages/VisualizePage');
  var Promise = require('bluebird');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');

  registerSuite(function () {
    var common;
    var settingsPage;
    var headerPage;
    var visualizePage;
    var discoverPage;
    var fromTime = '2015-09-20 06:31:44.000';
    var toTime = '2015-09-21 18:31:44.000';
    //var url = 'http://localhost:5601';
    // inverted timestamp makes loading saved items much easier in paginated lists
    var timestamp = '__' + (2000000000000 - Date.now());

    return {
      setup: function () {
        // curl -XDELETE http://localhost:9200/.kibana
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        headerPage = new HeaderPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        discoverPage = new DiscoverPage(this.remote);

        common.log('testVisualize Setup');
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .setWindowSize(1011, 800)
          // Here we can handle the situation if a default index exists or not
          // If it do exist, we'll be on the Discover tab when Kibana opens.

        .then(function selectTimeFieldOption() {
          return settingsPage
            .selectTimeFieldOption('@timestamp')
            .then(function clickCreateButton() {
              return settingsPage
                .clickCreateButton()
                .then(function clickDefaultIndexButton() {
                  return settingsPage
                    .clickDefaultIndexButton();
                });
            })
            .catch(function (reason) {
              common.log('we already have a default index so skip setting one');
              return;
            });
        });
      },


      'testAreaChartVisualization': function () {
        this.timeout = 60000;

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


        common.log('Start of testAreaChartVisualization');
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .setWindowSize(1011, 800)
          .then(function () {
            return headerPage
              .clickVisualize();
          })
          // find all the chart types and make sure there all there
          .then(function () {
            return visualizePage
              .getChartTypeCount()
              .then(function (chartTypeCount) {
                common.log('chartTypeCount = ' + chartTypeCount + ' Expected = ' + expectedChartTypeCount);
                expect(chartTypeCount).to.be(expectedChartTypeCount);
              });
          })
          .then(function () {
            return visualizePage
              .getChartTypes()
              .then(function (chartTypes) {
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
        // .then(function () {
        //   return visualizePage
        //     .clickNewVisualization()
        //     .then(function () {
        //       common.log('We found and clicked on the New Visualization button so there must be existing vis');
        //       return;
        //     })
        //     .catch(function () {
        //       common.log('We didn\'t find the New Visualization button so this must be the first');
        //       return;
        //     });
        // })


        .then(function () {
            return visualizePage
              .clickAreaChart();
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
          .then(function () {
            return visualizePage
              .getErrorMessage()
              .then(function (message) {
                common.log('message = ' + message);
                expect(message).to.be('Area charts require more than one data point. Try adding an X-Axis Aggregation');
              });
          })
          .then(function () {
            common.log('Click X-Axis');
            return visualizePage
              .clickBucket('X-Axis');
          })
          .then(function () {
            common.log('Click Date Histogram');
            return visualizePage
              .selectAggregation('Date Histogram');
          })
          .then(function () {
            return visualizePage
              .getSpinnerDone();
          })
          .then(function () {
            common.log('Check field value');
            return visualizePage
              .getField()
              .then(function (fieldValue) {
                common.log('fieldValue = ' + fieldValue);
                expect(fieldValue).to.be('@timestamp');
              });
          })
          .then(function () {
            return visualizePage
              .getInterval()
              .then(function (intervalValue) {
                common.log('intervalValue = ' + intervalValue);
                expect(intervalValue).to.be('Auto');
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
                fs.writeFileSync('./screenshot-AreaChart.png', data);
              });
          })
          .then(function sleep() {
            return common
              .sleep(1000);
          })
          .then(function () {
            return visualizePage
              .getXAxisLabels()
              .then(function (labels) {
                common.log('X-Axis labels = ' + labels);
                expect(labels).to.eql(xAxisLabels);
              });
          })
          .then(function () {
            return visualizePage
              .getYAxisLabels()
              .then(function (labels) {
                common.log('Y-Axis labels = ' + labels);
                expect(labels).to.eql(yAxisLabels);
              });
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
              .getAreaChartData()
              .then(function (paths) {
                expect(paths).to.eql(expectedAreaChartData);
              });
            //});
          });
      },

      // ///////////////////////////////////////////////////////////////////////////////////////
      'testDataTableVisualization': function () {
        var remote = this.remote;
        var expectedChartTypeCount = 8;
        var chartHeight = 0;
        var vizName2 = timestamp + ' Visualization Data Table';
        var expectedChartData = ['0 1,063', '2,000 1,422', '4,000 1,408', '6,000 1,477',
          '8,000 1,471', '10,000 82', '12,000 76', '14,000 66', '16,000 78', '18,000 66'
        ];



        common.log('Start of testDataTableVisualization');
        this.timeout = 60000;

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
          // .then(function () {
          //   return visualizePage
          //     .getSpinnerDone();
          // })
          .then(function loadSavedVisualization() {
            return visualizePage
              .loadSavedVisualization(vizName2)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-DataTable.png', data);
              });

          })
          .then(function getDataTableData() {
            return visualizePage
              .getDataTableData()
              .then(function showData(data) {
                common.log(data.split('\n'));
                expect(data.split('\n')).to.eql(expectedChartData);
              });
          });
      },



      'testLineChartVisualization': function () {

        var remote = this.remote;
        var vizName1 = timestamp + ' Visualization Line Chart';
        var expectedChartData = ['jpg 4,683', 'css 1,106', 'png 701', 'gif 494', 'php 225'];


        common.log('Start of testLineChartVisualization');
        this.timeout = 80000;
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
          .then(function loadSavedVisualization() {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-LineChart.png', data);
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
          });
      },


      'testMetricChartVisualization': function () {

        var remote = this.remote;
        var vizName1 = timestamp + ' Visualization Metric Chart';
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

        common.log('Start of testMetricChartVisualization');
        this.timeout = 80000;
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
          .then(function loadSavedVisualization() {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-MetricChart.png', data);
              });
          });
      },

      'testVerticalBarChartVisualization': function () {

        var remote = this.remote;
        var vizName1 = timestamp + ' Visualization Vertical Bar Chart';
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

        common.log('Start of testVerticalBarChartVisualization');

        this.timeout = 80000;
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
          .then(function loadSavedVisualization() {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-LineChart.png', data);
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
          .then(function getBarChartData() {
            return visualizePage
              .getBarChartData()
              .then(function showData(data) {
                common.log('data=' + data);
                common.log('data.length=' + data.length);
                expect(data).to.eql(expectedChartValues);
                common.log('Done');
              });
          });
      }



    };
  });
});
