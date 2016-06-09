import {
  bdd,
  common,
  headerPage,
  scenarioManager,
  settingsPage,
  visualizePage
} from '../../../support';

var expect = require('expect.js');

bdd.describe('visualize app', function describeIndexTests() {
  var fromTime = '2015-09-19 06:31:44.000';
  var toTime = '2015-09-23 18:31:44.000';

  bdd.before(function () {
    common.debug('navigateToApp visualize');
    return common.navigateToApp('visualize')
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
    var vizName1 = 'Visualization VerticalBarChart';

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
      });
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
        common.saveScreenshot('Visualize-vertical-bar-chart');
        expect(data).to.eql(expectedChartValues);
      });
    });


    bdd.it('should show correct data', function pageHeader() {
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
      });
    });
  });
});
