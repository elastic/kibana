
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  var fromTime = '2015-09-19 06:31:44.000';
  var toTime = '2015-09-23 18:31:44.000';

  bdd.before(function () {
    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToApp('visualize')
    .then(function () {
      PageObjects.common.debug('clickDataTable');
      return PageObjects.visualize.clickDataTable();
    })
    .then(function clickNewSearch() {
      PageObjects.common.debug('clickNewSearch');
      return PageObjects.visualize.clickNewSearch();
    })
    .then(function setAbsoluteRange() {
      PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    })
    .then(function clickBucket() {
      PageObjects.common.debug('Bucket = Split Rows');
      return PageObjects.visualize.clickBucket('Split Rows');
    })
    .then(function selectAggregation() {
      PageObjects.common.debug('Aggregation = Histogram');
      return PageObjects.visualize.selectAggregation('Histogram');
    })
    .then(function selectField() {
      PageObjects.common.debug('Field = bytes');
      return PageObjects.visualize.selectField('bytes');
    })
    .then(function setInterval() {
      PageObjects.common.debug('Interval = 2000');
      return PageObjects.visualize.setNumericInterval('2000');
    })
    .then(function clickGo() {
      return PageObjects.visualize.clickGo();
    })
    .then(function () {
      return PageObjects.header.getSpinnerDone();
    });
  });

  bdd.describe('data table', function indexPatternCreation() {
    var vizName1 = 'Visualization DataTable';

    bdd.it('should be able to save and load', function pageHeader() {
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
      .then(function () {
        return PageObjects.visualize.waitForVisualization();
      });
    });

    bdd.it('should show correct data, take screenshot', function pageHeader() {
      var chartHeight = 0;
      var expectedChartData = [ '0 2,088', '2,000 2,748', '4,000 2,707', '6,000 2,876',
      '8,000 2,863', '10,000 147', '12,000 148', '14,000 129', '16,000 161', '18,000 137'
      ];

      return PageObjects.visualize.getDataTableData()
      .then(function showData(data) {
        PageObjects.common.debug(data.split('\n'));
        PageObjects.common.saveScreenshot('Visualize-data-table');
        expect(data.split('\n')).to.eql(expectedChartData);
      });
    });

  });
});
