
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  bdd.before(function () {
    var fromTime = '2015-09-19 06:31:44.000';
    var toTime = '2015-09-23 18:31:44.000';

    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToApp('visualize')
    .then(function () {
      PageObjects.common.debug('clickLineChart');
      return PageObjects.visualize.clickLineChart();
    })
    .then(function clickNewSearch() {
      return PageObjects.visualize.clickNewSearch();
    })
    .then(function setAbsoluteRange() {
      PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    })
    .then(function clickBucket() {
      PageObjects.common.debug('Bucket = Split Chart');
      return PageObjects.visualize.clickBucket('Split Chart');
    })
    .then(function selectAggregation() {
      PageObjects.common.debug('Aggregation = Terms');
      return PageObjects.visualize.selectAggregation('Terms');
    })
    .then(function selectField() {
      PageObjects.common.debug('Field = extension');
      return PageObjects.visualize.selectField('extension.raw');
    })
    .then(function setInterval() {
      PageObjects.common.debug('switch from Rows to Columns');
      return PageObjects.visualize.clickColumns();
    })
    .then(function clickGo() {
      return PageObjects.visualize.clickGo();
    })
    .then(function () {
      return PageObjects.header.getSpinnerDone(); // only matches the hidden spinner
    });
  });

  bdd.describe('line charts', function indexPatternCreation() {
    var vizName1 = 'Visualization LineChart';

    bdd.it('should be able to save and load', function pageHeader() {
      var remote = this.remote;

      return PageObjects.visualize.saveVisualization(vizName1)
      .then(function (message) {
        PageObjects.common.debug('Saved viz message = ' + message);
        expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
      })
      .then(function testVisualizeWaitForToastMessageGone() {
        return PageObjects.visualize.waitForToastMessageGone();
      })
      .then(function () {
        return PageObjects.visualize.loadSavedVisualization(vizName1);
      })
      .then(function waitForVisualization() {
        return PageObjects.visualize.waitForVisualization();
      });
    });


    bdd.it('should show correct chart, take screenshot', function pageHeader() {

      var remote = this.remote;

      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      var expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      // sleep a bit before trying to get the chart data
      return PageObjects.common.sleep(3000)
      .then(function () {
        return PageObjects.visualize.getLineChartData('fill="#57c17b"')
        .then(function showData(data) {
          PageObjects.common.saveScreenshot('Visualize-line-chart');
          var tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
          for (var x = 0; x < data.length; x++) {
            PageObjects.common.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
              (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
              ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
            expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
          }
          PageObjects.common.debug('Done');
        });
      });
    });

    bdd.it('should show correct data', function pageHeader() {

      var remote = this.remote;
      var expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      return PageObjects.visualize.collapseChart()
      .then(function getDataTableData() {
        return PageObjects.visualize.getDataTableData();
      })
      .then(function showData(data) {
        PageObjects.common.debug(data.split('\n'));
        expect(data.trim().split('\n')).to.eql(expectedChartData);
      });
    });


  });
});
