define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/discover_page');
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
          common.debug('setAbsoluteRange');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .catch(common.handleError(this));
      });


      bdd.describe('query', function () {
        var queryName1 = 'Query # 1';
        var fromTimeString = 'September 19th 2015, 06:31:44.000';
        var toTimeString = 'September 23rd 2015, 18:31:44.000';

        bdd.it('should show correct time range string by timepicker', function () {
          var expectedTimeRangeString = fromTimeString + ' to ' + toTimeString;
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

        bdd.it('should show the correct hit count', function () {
          var expectedHitCount = '14,004';
          return common.tryForTime(20 * 1000, function tryingForTime() {
            return discoverPage.getHitCount()
            .then(function compareData(hitCount) {
              expect(hitCount).to.be(expectedHitCount);
            });
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
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct time range string in chart', function () {
          var expectedTimeRangeString = fromTimeString + ' - ' + toTimeString;
          return discoverPage.getChartTimespan()
          .then(function (actualTimeString) {
            expect(actualTimeString).to.be(expectedTimeRangeString);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct initial chart interval of 3 hours', function () {
          var expectedChartInterval = 'by 3 hours';
          return discoverPage.getChartInterval()
          .then(function (actualInterval) {
            expect(actualInterval).to.be(expectedChartInterval);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data for chart interval Hourly', function () {
          var chartInterval = 'Hourly';
          var expectedBarChartData = [ '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
            '0', '0', '0', '0', '0', '0', '0', '0', '1.2763636363636266', '1.914545454545447',
            '4.680000000000007', '6.594545454545454', '11.061818181818168', '25.314545454545453',
            '38.50363636363636', '46.374545454545455', '72.53999999999999', '93.60000000000001',
            '102.10909090909091', '109.97999999999999', '111.04363636363637', '94.87636363636364',
            '85.72909090909091', '68.28545454545454', '54.88363636363636', '36.58909090909091',
            '20.209090909090904', '11.700000000000003', '8.083636363636359', '5.105454545454549',
            '0.6381818181818204', '0.8509090909090986', '2.3400000000000034', '2.978181818181824',
            '3.61636363636363', '8.083636363636359', '10.423636363636362', '24.46363636363637',
            '32.33454545454545', '45.94909090909091', '67.00909090909092', '85.51636363636365',
            '94.87636363636364', '109.1290909090909', '110.61818181818181', '100.83272727272727',
            '89.55818181818182', '65.30727272727273', '48.92727272727274', '36.16363636363636',
            '21.059999999999988', '10.210909090909098', '6.38181818181819', '3.190909090909088',
            '2.127272727272725', '0.4254545454545422', '1.701818181818183', '1.4890909090909048',
            '3.61636363636363', '7.232727272727274', '7.870909090909095', '22.123636363636365',
            '32.54727272727273', '51.267272727272726', '66.58363636363637', '85.94181818181818',
            '104.66181818181818', '108.91636363636364', '107.00181818181818', '100.62',
            '80.62363636363636', '62.32909090909091', '58.92545454545455', '33.18545454545455',
            '21.059999999999988', '11.274545454545446', '10.423636363636362', '3.403636363636366',
            '1.914545454545447', '0.8509090909090986', '0', '0', '0', '0', '0', '0',
            '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'
          ];
          return discoverPage.setChartInterval(chartInterval)
          .then(function () {
            return common.sleep(8000);
          })
          .then(function () {
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data for chart interval Daily', function () {
          var chartInterval = 'Daily';
          var expectedBarChartData = [ '0', '111.3138', '107.96759999999999', '108.4122', '0'];
          return discoverPage.setChartInterval(chartInterval)
          .then(function () {
            return common.sleep(8000);
          })
          .then(function () {
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data for chart interval Weekly', function () {
          var chartInterval = 'Weekly';
          var expectedBarChartData = [ '55.6569', '108.1899'];
          return discoverPage.setChartInterval(chartInterval)
          .then(function () {
            return common.sleep(2000);
          })
          .then(function () {
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data for chart interval Monthly', function () {
          var chartInterval = 'Monthly';
          var expectedBarChartData = [ '102.404'];
          return discoverPage.setChartInterval(chartInterval)
          .then(function () {
            return common.sleep(2000);
          })
          .then(function () {
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show correct data for chart interval Yearly', function () {
          var chartInterval = 'Yearly';
          var expectedBarChartData = [ '102.404'];
          return discoverPage.setChartInterval(chartInterval)
          .then(function () {
            return common.sleep(2000);
          })
          .then(function () {
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });



        bdd.it('should show correct data for chart interval Auto', function () {
          var chartInterval = 'Auto';
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
          return discoverPage.setChartInterval(chartInterval)
          .then(function () {
            return common.sleep(4000);
          })
          .then(function () {
            return verifyChartData(expectedBarChartData);
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show Auto chart interval of 3 hours', function () {
          var expectedChartInterval = 'by 3 hours';
          return discoverPage.getChartInterval()
          .then(function (actualInterval) {
            expect(actualInterval).to.be(expectedChartInterval);
          })
          .catch(common.handleError(this));
        });


        function verifyChartData(expectedBarChartData) {
          return common.tryForTime(20 * 1000, function tryingForTime() {
            return discoverPage.getBarChartData()
            .then(function compareData(paths) {
              // the largest bars are over 100 pixels high so this is less than 1% tolerance
              var barHeightTolerance = 1;
              var stringResults = '';
              var hasFailure = false;
              for (var y = 0; y < expectedBarChartData.length; y++) {
                stringResults += y + ': expected = ' + expectedBarChartData[y] + ', actual = ' + paths[y] +
                 ', Pass = ' + (Math.abs(expectedBarChartData[y] - paths[y]) < barHeightTolerance) + '\n';
                if ((Math.abs(expectedBarChartData[y] - paths[y]) > barHeightTolerance)) {
                  hasFailure = true;
                };
              };
              if (hasFailure) {
                common.log(stringResults);
                common.log(paths);
              }
              for (var x = 0; x < expectedBarChartData.length; x++) {
                expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
              }
            });
          });

        }

      });
    });
  };
});
