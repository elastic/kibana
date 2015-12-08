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
      var remote;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        remote = this.remote;
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
          return settingsPage.navigateTo();
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
          common.debug('clickTimepicker');
          return headerPage.clickTimepicker();
        })
        .then(function () {
          common.debug('setAbsoluteRange');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          common.debug('collapseTimepicker');
          return headerPage.collapseTimepicker();
        });
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
          var expectedBarChartData = [0,0,0,0,1.0968749999999972,7.6781250000000085,
            37.87875,92.210625,108.590625,71.80875,23.54625,4.753124999999997,
            2.1206249999999898,7.60499999999999,35.319374999999994,85.044375,110.199375,
            70.05375000000001,23.180625000000006,4.0218750000000085,1.2431250000000063,
            6.435000000000002,36.416250000000005,88.408125,108.81,
            69.395625,22.522499999999994,5.4112499999999955,0.29249999999998977,0,0,0,0,0,0,0,0];
          return common.sleep(4000)
          .then(function () {
            return common.tryForTime(60 * 1000, function tryingForTime() {
              return discoverPage.getBarChartData()
              .then(function compareData(paths) {
                // the largest bars are over 100 pixels high so this is less than 1% tolerance
                var barHeightTolerance = 1;
                for (var x = 0; x < expectedBarChartData.size; x++) {
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
