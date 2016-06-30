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
    });
  });

  bdd.describe('data table', function indexPatternCreation() {
    var vizName1 = 'Visualization DataTable';

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
      });
    });

    bdd.it('should show correct data, take screenshot', function pageHeader() {
      var chartHeight = 0;
      var expectedChartData = [ '0 2,088', '2,000 2,748', '4,000 2,707', '6,000 2,876',
      '8,000 2,863', '10,000 147', '12,000 148', '14,000 129', '16,000 161', '18,000 137'
      ];

      return visualizePage.getDataTableData()
      .then(function showData(data) {
        common.debug(data.split('\n'));
        common.saveScreenshot('Visualize-data-table');
        expect(data.split('\n')).to.eql(expectedChartData);
      });
    });

  });
});
