import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('visualize app', function describeIndexTests() {

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new');
    });

    describe('chart types', function indexPatternCreation() {
      it('should show the correct chart types', function () {
        const expectedChartTypes = [
          'Area chart', 'Data table', 'Heatmap chart', 'Horizontal bar chart', 'Line chart', 'Markdown widget',
          'Metric', 'Pie chart', 'Tag cloud', 'Tile map', 'Time Series Visual Builder', 'Timelion', 'Vertical bar chart'
        ];
        // find all the chart types and make sure there all there
        return PageObjects.visualize.getChartTypes()
          .then(function testChartTypes(chartTypes) {
            log.debug('returned chart types = ' + chartTypes);
            log.debug('expected chart types = ' + expectedChartTypes);
            PageObjects.common.saveScreenshot('Visualize-chart-types');
            expect(chartTypes).to.eql(expectedChartTypes);
          });
      });
    });
  });
}
