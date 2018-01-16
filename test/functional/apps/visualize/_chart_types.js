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
          'Area',
          'Heat Map',
          'Horizontal Bar',
          'Line',
          'Pie',
          'Vertical Bar',
          'Data Table',
          'Gauge',
          'Goal',
          'Metric',
          'Coordinate Map',
          'Region Map',
          'Timelion',
          'Visual Builder',
          'Controls',
          'Markdown',
          'Tag Cloud',
          'Vega',
        ];

        // find all the chart types and make sure there all there
        return PageObjects.visualize.getChartTypes()
          .then(function testChartTypes(chartTypes) {
            log.debug('returned chart types = ' + chartTypes);
            log.debug('expected chart types = ' + expectedChartTypes);
            expect(chartTypes).to.eql(expectedChartTypes);
          });
      });
    });
  });
}
