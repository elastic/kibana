import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {

  bdd.before(function () {
    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToUrl('visualize', 'step/1');
  });

  bdd.describe('chart types', function indexPatternCreation() {
    bdd.it('should show the correct chart types', function () {
      const expectedChartTypes = [
        'Area chart', 'Data table', 'Heatmap chart', 'Line chart', 'Markdown widget',
        'Metric', 'Pie chart', 'Tag cloud', 'Tile map', 'Timeseries', 'Vertical bar chart'
      ];
      // find all the chart types and make sure there all there
      return PageObjects.visualize.getChartTypes()
        .then(function testChartTypes(chartTypes) {
          PageObjects.common.debug('returned chart types = ' + chartTypes);
          PageObjects.common.debug('expected chart types = ' + expectedChartTypes);
          PageObjects.common.saveScreenshot('Visualize-chart-types');
          expect(chartTypes).to.eql(expectedChartTypes);
        });
    });
  });
});
