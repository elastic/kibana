define(function (require) {
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');
  var VisualizePage = require('../../../support/pages/visualize_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('visualize app', function describeIndexTests() {
      var common;
      var settingsPage;
      var visualizePage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        visualizePage = new VisualizePage(this.remote);

        return scenarioManager.reload('emptyKibana')
        .then(function () {
          common.debug('navigateTo');
          return settingsPage.navigateTo();
        })
        .then(function () {
          common.debug('createIndexPattern');
          return settingsPage.createIndexPattern();
        })
        .then(function () {
          common.debug('navigateToApp visualize');
          return common.navigateToApp('visualize');
        })
        .catch(common.handleError(this));
      });


      bdd.describe('chart types', function indexPatternCreation() {

        bdd.it('should show the correct chart types', function pageHeader() {

          var expectedChartTypes = [
            'Area chart', 'Data table', 'Line chart', 'Markdown widget',
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
  };
});
