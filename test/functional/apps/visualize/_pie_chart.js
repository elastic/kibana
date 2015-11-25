define(function (require) {
  var Common = require('../../../support/pages/Common');
  var HeaderPage = require('../../../support/pages/HeaderPage');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var DiscoverPage = require('../../../support/pages/DiscoverPage');
  var VisualizePage = require('../../../support/pages/VisualizePage');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('visualize app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var visualizePage;
      var remote;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        remote = this.remote;
        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

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
        .then(function () {
          common.debug('clickPieChart');
          return visualizePage.clickPieChart();
        })
        .then(function clickNewSearch() {
          return visualizePage.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          common.debug('select bucket Split Slices');
          return visualizePage.clickBucket('Split Slices');
        })
        .then(function () {
          common.debug('Click aggregation Histogram');
          return visualizePage.selectAggregation('Histogram');
        })
        .then(function () {
          common.debug('Click field memory');
          return visualizePage.selectField('memory');
        })
        .then(function () {
          return headerPage.getSpinnerDone();
        })
        .then(function sleep() {
          return common.sleep(1003);
        })
        .then(function () {
          common.debug('setNumericInterval 4000');
          return visualizePage.setNumericInterval('40000');
        })
        .then(function () {
          common.debug('clickGo');
          return visualizePage.clickGo();
        })
        .then(function () {
          return headerPage.getSpinnerDone();
        });
      });


      bdd.describe('pie chart', function indexPatternCreation() {


        bdd.it('should save and load, take screenshot', function pageHeader() {
          var testSubName = 'PieChart';
          common.debug('Start of test' + testSubName + 'Visualization');
          var vizName1 = 'Visualization ' + testSubName;
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
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data', function pageHeader() {
          var remote = this.remote;
          var expectedTableData =  [ '0 55', '40,000 50', '80,000 41', '120,000 43',
            '160,000 44', '200,000 40', '240,000 46', '280,000 39', '320,000 40', '360,000 47'
          ];

          return visualizePage.collapseChart()
          .then(function () {
            return settingsPage.setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage.getDataTableData();
          })
          .then(function showData(data) {
            common.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedTableData);
          })
          // expandChart (toggle)
          .then(function () {
            return visualizePage.collapseChart();
          })
          .then(function sleep() {
            return common.sleep(500);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show 10 slices in pie chart', function pageHeader() {
          var remote = this.remote;
          var expectedPieChartSliceCount = 10;

          return visualizePage.getPieChartData()
          .then(function (pieData) {
            var barHeightTolerance = 1;
            common.debug('pieData.length = ' + pieData.length);
            expect(pieData.length).to.be(expectedPieChartSliceCount);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct pie chart', function pageHeader() {
          var remote = this.remote;
          var expectedPieChartData = ['M1.6287802428659797e-14,-266A266,266 0 0,1 186.423260490228,-189.7428995988851L0,0Z',
            'M186.423260490228,-189.7428995988851A266,266 0 0,1 264.9649304513469,-23.443242755918007L0,0Z',
            'M264.9649304513469,-23.443242755918007A266,266 0 0,1 234.6187141689211,125.33977406123763L0,0Z',
            'M234.6187141689211,125.33977406123763A266,266 0 0,1 121.1795889866941,236.79422968690744L0,0Z',
            'M121.1795889866941,236.79422968690744A266,266 0 0,1 -39.29150777194618,263.0820735379115L0,0Z',
            'M-39.29150777194618,263.0820735379115A266,266 0 0,1 -173.99934467956413,201.19698817597202L0,0Z',
            'M-173.99934467956413,201.19698817597202A266,266 0 0,1 -260.25215442174243,54.99832832770035L0,0Z',
            'M-260.25215442174243,54.99832832770035A266,266 0 0,1 -250.55927263541136,-89.30873919395349L0,0Z',
            'M-250.55927263541136,-89.30873919395349A266,266 0 0,1 -163.84815106702368,-209.54661388797908L0,0Z',
            'M-163.84815106702368,-209.54661388797908A266,266 0 0,1 -4.886340728597939e-14,-266L0,0Z'
          ];

          return visualizePage.getPieChartData()
          .then(function (pieData) {
            for (var x = 0; x < expectedPieChartData.length; x++) {
              common.log('expected[' + x + '] = ' + expectedPieChartData[x] +
              '\n                   actual = ' + pieData[x]
              );
              expect(expectedPieChartData[x]).to.be(pieData[x]);
            }
          })
          .catch(common.handleError(this));
        });

      });
    });
  };
});
