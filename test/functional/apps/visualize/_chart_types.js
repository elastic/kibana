import {
  bdd,
  common,
  scenarioManager,
  settingsPage,
  visualizePage
} from '../../../support';

(function () {
  var expect = require('expect.js');

  (function () {
    bdd.describe('visualize app', function describeIndexTests() {

      bdd.before(function () {
        common.debug('navigateToApp visualize');
        return common.navigateToApp('visualize');
      });

      bdd.describe('chart types', function indexPatternCreation() {

        bdd.it('should show the correct chart types', function pageHeader() {

          var expectedChartTypes = [
            'Area chart', 'Data table', 'Heatmap', 'Line chart', 'Markdown widget',
            'Metric', 'Pie chart', 'Tile map', 'Vertical bar chart'
          ];
          // find all the chart types and make sure there all there
          return visualizePage.getChartTypes()
          .then(function testChartTypes(chartTypes) {
            common.debug('returned chart types = ' + chartTypes);
            common.debug('expected chart types = ' + expectedChartTypes);
            expect(chartTypes).to.eql(expectedChartTypes);
          })
          .catch(common.handleError(this));
        });
      });
    });
  }());
}());
