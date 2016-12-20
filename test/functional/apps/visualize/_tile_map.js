define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/discover_page');
  var VisualizePage = require('../../../support/pages/visualize_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('visualize app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var visualizePage;
      var fromTime;
      var toTime;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        fromTime = '2015-09-19 06:31:44.000';
        toTime = '2015-09-23 18:31:44.000';

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
          return settingsPage.clickAdvancedTab();
        })
        .then(function GetAdvancedSetting() {
          common.debug('check for required UTC timezone');
          return settingsPage.getAdvancedSettings('dateFormat:tz');
        })
        .then(function (advancedSetting) {
          expect(advancedSetting).to.be('UTC');
        })
        .then(function () {
          common.debug('navigateToApp visualize');
          return common.navigateToApp('visualize');
        })
        .then(function () {
          common.debug('clickTileMap');
          return visualizePage.clickTileMap();
        })
        .then(function () {
          return visualizePage.clickNewSearch();
        })
        .then(function () {
          common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          common.debug('select bucket Geo Coordinates');
          return visualizePage.clickBucket('Geo Coordinates');
        })
        .then(function () {
          common.debug('Click aggregation Geohash');
          return visualizePage.selectAggregation('Geohash');
        })
        .then(function () {
          common.debug('Click field geo.coordinates');
          return common.tryForTime(1000, function () {
            return visualizePage.selectField('geo.coordinates');
          });
        })
        .then(function () {
          return visualizePage.clickGo();
        })
        .then(function () {
          return headerPage.getSpinnerDone();
        })
        .catch(common.handleError(this));
      });


      bdd.describe('tile map chart', function indexPatternCreation() {

        bdd.it('should save and load, take screenshot', function pageHeader() {
          var testSubName = 'TileMap';
          common.debug('Start of test' + testSubName + 'Visualization');
          var vizName1 = 'Visualization ' + testSubName;

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
          })
          // sleep a bit before taking the screenshot or it won't show data
          .then(function sleep() {
            return common.sleep(4000);
          })
          .then(function takeScreenshot() {
            common.debug('Take screenshot');
            common.saveScreenshot('./screenshot-' + testSubName + '.png');
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct tile map data', function pageHeader() {
          var testSubName = 'TileMap';
          common.debug('Start of test' + testSubName + 'Visualization');
          var expectedTableData = [ 'dn 1,429', 'dp 1,418', '9y 1,215', '9z 1,099', 'dr 1,076',
            'dj 982', '9v 938', '9q 722', '9w 475', 'cb 457', 'c2 453', '9x 420', 'dq 399',
            '9r 396', '9t 274', 'c8 271', 'dh 214', 'b6 207', 'bd 206', 'b7 167', 'f0 141',
            'be 128', '9m 126', 'bf 85', 'de 73', 'bg 71', '9p 71', 'c1 57', 'c4 50', '9u 48',
            'f2 46', '8e 45', 'b3 38', 'bs 36', 'c0 31', '87 28', 'bk 23', '8f 18', 'b5 14',
            '84 14', 'dx 9', 'bu 9', 'b1 9', 'b4 6', '9n 3', '8g 3'
          ];

          return visualizePage.collapseChart()
          .then(function () {
            return settingsPage.setPageSize('All');
          })
          .then(function getDataTableData() {
            return visualizePage.getDataTableData()
            .then(function showData(data) {
              common.debug(data.split('\n'));
              expect(data.trim().split('\n')).to.eql(expectedTableData);
            });
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
