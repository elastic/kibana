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
            return common.sleep(3000);
          })
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
          var expectedBarChartData = [ '3.237',
            '17.674', '64.75', '125.737', '119.962', '65.712', '16.449',
            '2.712', '3.675', '17.674', '59.762', '119.087', '123.812',
            '61.862', '15.487', '2.362', '2.800', '15.312', '61.862', '123.2',
            '118.562', '63.524', '17.587', '2.537'
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
          var expectedBarChartData = [ '1.527', '2.290',
            '5.599', '7.890', '13.236', '30.290', '46.072', '55.490', '86.8',
            '112', '122.181', '131.6', '132.872', '113.527', '102.581',
            '81.709', '65.672', '43.781', '24.181', '14', '9.672', '6.109',
            '0.763', '1.018', '2.800', '3.563', '4.327', '9.672', '12.472',
            '29.272', '38.690', '54.981', '80.181', '102.327', '113.527',
            '130.581', '132.363', '120.654', '107.163', '78.145', '58.545',
            '43.272', '25.199', '12.218', '7.636', '3.818', '2.545', '0.509',
            '2.036', '1.781', '4.327', '8.654', '9.418', '26.472', '38.945',
            '61.345', '79.672', '102.836', '125.236', '130.327', '128.036',
            '120.4', '96.472', '74.581', '70.509', '39.709', '25.199', '13.490',
            '12.472', '4.072', '2.290', '1.018'
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
          var expectedBarChartData = [
            '133.196', '129.192', '129.724'
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

        bdd.it('should show correct data for chart interval Weekly', function () {
          var chartInterval = 'Weekly';
          var expectedBarChartData = [ '66.598', '129.458'];
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
          var expectedBarChartData = [ '122.535'];
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
          var expectedBarChartData = [ '122.535'];
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
          var expectedBarChartData = [ '3.237',
            '17.674', '64.75', '125.737', '119.962', '65.712', '16.449',
            '2.712', '3.675', '17.674', '59.762', '119.087', '123.812',
            '61.862', '15.487', '2.362', '2.800', '15.312', '61.862', '123.2',
            '118.562', '63.524', '17.587', '2.537'
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
