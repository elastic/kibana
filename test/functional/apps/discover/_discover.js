define(function (require) {
  var Common = require('../../../support/pages/Common');
  var HeaderPage = require('../../../support/pages/HeaderPage');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var DiscoverPage = require('../../../support/pages/DiscoverPage');
  var expect = require('intern/dojo/node!expect.js');
  //var Promise = require('bluebird');

  return function (bdd) {
    bdd.describe('discover app', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var remote;
      var fromTime;
      var toTime;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        remote = this.remote;
        fromTime = '2015-09-19 06:31:44.000';
        toTime = '2015-09-23 18:31:44.000';
      });

      bdd.beforeEach(function be() {
        return settingsPage.createIndex()
        .then(function () {
          return headerPage.clickDiscover()
          .then(function () {
            return discoverPage.clickTimepicker();
          })
          .then(function () {
            return discoverPage.setAbsoluteRange(fromTime, toTime);
          })
          .then(function () {
            return discoverPage.collapseTimepicker();
          });
        });
      });

      // bdd.afterEach(function ae() {
      //   return settingsPage.removeIndex();
      // });


      bdd.describe('query', function indexPatternCreation() {

        bdd.it('should save and re-open', function pageHeader() {

          // this.timeout = 80000;

          var expectedTimeRangeString =
          'September 19th 2015, 06:31:44.000 to September 23rd 2015, 18:31:44.000';
          var queryName1 = 'Query # 1';

          return discoverPage.getTimespanText()
          .then(function (actualTimeString) {
            common.debug('actualTimeString = ' + actualTimeString);
            expect(actualTimeString).to.be(expectedTimeRangeString);
          })
          .then(function () {
            return discoverPage.saveSearch(queryName1);
          })
          .then(function () {
            return common.sleep(2000);
          })
          .then(function () {
            common.debug('getCurrentQueryName');
            return common.tryForTime(5000, function () {
              return discoverPage.getCurrentQueryName()
              .then(function (actualQueryNameString) {
                expect(actualQueryNameString).to.be(queryName1);
              });
            });
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show the correct bar chart', function pageHeader() {

          // this.timeout = 80000;

          var expectedBarChartData = [0,0,0,0,1.0968749999999972,7.6781250000000085,
            37.87875,92.210625,108.590625,71.80875,23.54625,4.753124999999997,
            2.1206249999999898,7.60499999999999,35.319374999999994,85.044375,110.199375,
            70.05375000000001,23.180625000000006,4.0218750000000085,1.2431250000000063,
            6.435000000000002,36.416250000000005,88.408125,108.81,
            69.395625,22.522499999999994,5.4112499999999955,0.29249999999998977,0,0,0,0,0,0,0,0];

          return common.sleep(2000)
          .then(function () {
            common.debug(' Get Bar Chart data');
            return discoverPage.getBarChartData();
          })
          .then(function compareData(paths) {
            common.debug('Expected Bar Chart data = ' + expectedBarChartData);
            common.debug('Actual   Bar Chart data = ' + paths);
            var barHeightTolerance = 1; // the largest bars are over 100 pixels high so this is less than 1% tolerance
            for (var x = 0; x < expectedBarChartData.size; x++) {
              common.debug(x + '  Expected: ' + expectedBarChartData[x] + ' Actual: ' +
               paths[x] + ' diff =' + (expectedBarChartData[x] - paths[x]) + '\n');
              expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
            }
            common.debug('Done');
          })
          .catch(common.handleError(this));
        });



      });
    });
  };
});
