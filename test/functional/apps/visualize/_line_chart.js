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
  bdd.before(function () {
    var fromTime = '2015-09-19 06:31:44.000';
    var toTime = '2015-09-23 18:31:44.000';

    common.debug('navigateToApp visualize');
    return common.navigateToApp('visualize')
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
      return visualizePage.selectField('extension.raw');
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
    });
  });

  bdd.describe('line charts', function indexPatternCreation() {
    var vizName1 = 'Visualization LineChart';

    bdd.it('should be able to save and load', function pageHeader() {
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
      .then(function waitForVisualization() {
        return visualizePage.waitForVisualization();
      });
    });


    bdd.it('should show correct chart, take screenshot', function pageHeader() {

      var remote = this.remote;

      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      var expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      // sleep a bit before trying to get the chart data
      return common.sleep(3000)
      .then(function () {
        return visualizePage.getLineChartData('fill="#57c17b"')
        .then(function showData(data) {
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

    bdd.it('should show correct data', function pageHeader() {

      var remote = this.remote;
      var expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      return visualizePage.collapseChart()
      .then(function getDataTableData() {
        return visualizePage.getDataTableData();
      })
      .then(function showData(data) {
        common.debug(data.split('\n'));
        expect(data.trim().split('\n')).to.eql(expectedChartData);
      });
    });


  });
});
