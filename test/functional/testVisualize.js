// Kibana is loading. Give me a moment here. I'm loading a whole bunch of code. Don't worry, all this good stuff will be cached up for next time!
//http://localhost:5601/app/kibana#/settings/indices/?_g=%28refreshInterval:%28display:Off,pause:!f,value:0%29,time:%28from:now-15m,mode:quick,to:now%29%29
//http://localhost:5601/app/kibana#/settings/indices/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))
// long timeout if ElasticSearch isn't running...

// we need to create a default index to be able to navigate around.

define([
  'intern!object',
  'intern/chai!assert',
  'intern/dojo/node!fs',
  '../support/pages/SettingsPage',
  '../support/pages/HeaderPage',
  '../support/pages/VisualizePage'

], function (registerSuite, assert, fs, SettingsPage, HeaderPage, VisualizePage) {

  registerSuite(function () {
    var settingsPage;
    var headerPage;
    var visualizePage;
    var url = 'http://localhost:5601';
    var expectedChartTypeCount = 8;
    var expectedChartTypes = [
      'Area chart', 'Data table', 'Line chart', 'Markdown widget',
      'Metric', 'Pie chart', 'Tile map', 'Vertical bar chart'
    ];
    var vizName1 = 'Visualization # 1';

    return {
      // on setup, we create an headerPage instance
      // that we will use for all the tests
      setup: function () {
        // curl -XDELETE http://localhost:9200/.kibana
        settingsPage = new SettingsPage(this.remote);
        headerPage = new HeaderPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
      },

      'testSavingVisualization': function () {
        var remote = this.remote;
        return this.remote
          .get(url)
          .then(function () {
            return remote
              .setWindowSize(1600, 1024);
          })
          .then(function () {
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            return settingsPage
              .clickCreateButton();
          })
          .then(function () {
            return settingsPage
              .clickDefaultIndexButton();
          })
          .then(function () {
            return headerPage.clickVisualize();
          })
          // find all the chart types and make sure there all there
          .then(function () {
            return visualizePage
              .getChartTypeCount()
              .then(function (chartTypeCount) {
                console.log('chartTypeCount = ' + chartTypeCount);
                assert.strictEqual(chartTypeCount, expectedChartTypeCount, 'Expected the correct number of chart types.');
              });
          })
          .then(function () {
            return visualizePage
              .getChartTypes()
              .then(function (chartTypes) {
                console.log('returned chart types = ' + chartTypes);
                assert.deepEqual(chartTypes.sort, expectedChartTypes.sort, 'Expected the correct chart types.');
              });
          })
          .then(function () {
            return visualizePage
              .clickAreaChart();
          })
          .then(function () {
            return visualizePage
              .clickNewSearch();
          })
          .then(function () {
            return visualizePage
              .getErrorMessage()
              .then(function (message) {
                console.log(message);
                // No results found
                //  - or -
                // Area charts require more than one data point. Try adding an X-Axis Aggregation
                // Depends on the data loaded?
              });
          })
          .then(function () {
            return visualizePage
              .clickBucket('X-Axis');
          })
          .then(function () {
            return visualizePage
              // .selectAggregation('Date Histogram');
              .selectAggregation2('Date Histogram');
          })
          .then(function () {
            return visualizePage
              .getField()
              .then(function (fieldValue) {
                console.log('fieldValue = ' + fieldValue);
                assert.strictEqual(fieldValue, '@timestamp', 'Expected default Field value to be \'@timestmap\'');
              });
          })
          .then(function () {
            return visualizePage
              .getInterval()
              .then(function (intervalValue) {
                console.log('intervalValue = ' + intervalValue);
                assert.strictEqual(intervalValue, 'Auto', 'Expected default Interval value to be \'Auto\'');
              });
          })
          .then(function () {
            return visualizePage
              .clickGo();
          })
          .then(function () {
            return visualizePage
              .saveVisualization(vizName1)
              .then(function (message) {
                console.log('Saved viz message = ' + message);
                assert.strictEqual(message, 'Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
              });
          })
          .then(function () {
            return visualizePage
              .loadSavedVisualization(vizName1)
              // take a snapshot just as an example.  Probably need to change the location to save them...
              .takeScreenshot()
              .then(function (data) {
                fs.writeFileSync('./screenshot-' + Date.now() + '.png', data);
              });
          })
          .then(function () {
            return visualizePage
              .getXAxisLabels()
              .then(function (labels) {
                console.log('X-Axis labels = \n' + labels);
              });
          })
          .then(function () {
            return visualizePage
              .getYAxisLabels()
              .then(function (labels) {
                console.log('Y-Axis labels = \n' + labels);
              });
          })
          .then(function () {
            return visualizePage
              .getChartData()
              .then(function (paths) {
                console.log('path 0 (vertical Y-Axis)   = \n' + paths[0]);
                console.log('path 1 (horizontal X-Axis) = \n' + paths[1]);
                console.log('path 2 (chart data)        = \n' + paths[2]);
              });
          });
      }
    };
  });
});
