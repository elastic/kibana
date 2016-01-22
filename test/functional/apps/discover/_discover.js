define(function (require) {
  var Common = require('../../../support/pages/Common');
  var HeaderPage = require('../../../support/pages/HeaderPage');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/DiscoverPage');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('discover app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

        // start each test with an empty kibana index
        return scenarioManager.reload('emptyKibana')
        // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return scenarioManager.loadIfEmpty('logstashFunctional');
        })
        .then(function (navigateTo) {
          common.debug('navigateTo');
          return settingsPage.navigateTo().then(settingsPage.clickExistingIndicesAddDataLink);
        })
        .then(function () {
          common.debug('createIndexPattern');
          return settingsPage.createIndexPattern();
        })
        .then(function () {
          common.debug('discover');
          return common.navigateToApp('discover');
        })
        .then(function () {
          common.debug('setAbsoluteRange');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .catch(common.handleError(this));
      });


      bdd.describe('query', function () {
        var queryName1 = 'Query # 1';

        bdd.it('should show correct time range string', function () {
          var expectedTimeRangeString =
          'September 19th 2015, 06:31:44.000 to September 23rd 2015, 18:31:44.000';
          return discoverPage.getTimespanText()
          .then(function (actualTimeString) {
            expect(actualTimeString).to.be(expectedTimeRangeString);
          })
          .catch(common.handleError(this));
        });

        bdd.it('save query should show toast message and display query name', function () {
          var expectedSavedQueryMessage = 'Discover: Saved Data Source "' + queryName1 + '"';
          return discoverPage.saveSearch(queryName1)
          .then(function () {
            return headerPage.getToastMessage();
          })
          .then(function (toastMessage) {
            expect(toastMessage).to.be(expectedSavedQueryMessage);
          })
          .then(function () {
            return headerPage.waitForToastMessageGone();
          })
          .then(function () {
            return discoverPage.getCurrentQueryName();
          })
          .then(function (actualQueryNameString) {
            expect(actualQueryNameString).to.be(queryName1);
          })
          .catch(common.handleError(this));
        });

        bdd.it('load query should show query name', function () {
          return discoverPage.loadSavedSearch(queryName1)
          .then(function () {
            return discoverPage.getCurrentQueryName();
          })
          .then(function (actualQueryNameString) {
            expect(actualQueryNameString).to.be(queryName1);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show the correct bar chart', function () {
          var expectedBarChartData = [ '0', '0', '0', '0', '0', '0',
            '2.7056249999999977', '14.771249999999995', '54.112500000000004',
            '105.080625', '100.25437500000001', '54.916875', '13.747499999999988',
            '2.266874999999999', '3.0712500000000063', '14.771249999999995',
            '49.944374999999994', '99.523125', '103.471875', '51.699375',
            '12.943124999999995', '1.9743749999999949', '2.3400000000000034',
            '12.796875', '51.699375', '102.96000000000001', '99.08437500000001',
            '53.08875', '14.698125000000005', '2.1206249999999898', '0', '0',
            '0', '0', '0', '0', '0'
          ];
          return common.sleep(4000)
          .then(function () {
            return common.tryForTime(20 * 1000, function tryingForTime() {
              return discoverPage.getBarChartData()
              .then(function compareData(paths) {
                // the largest bars are over 100 pixels high so this is less than 1% tolerance
                var barHeightTolerance = 1;
                for (var y = 0; y < expectedBarChartData.length; y++) {
                  common.debug(y + ': expected = ' + expectedBarChartData[y] + ', actual = ' + paths[y] +
                   ', Pass = ' + (Math.abs(expectedBarChartData[y] - paths[y]) < barHeightTolerance));
                };
                for (var x = 0; x < expectedBarChartData.length; x++) {
                  expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
                }
              });
            });
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
