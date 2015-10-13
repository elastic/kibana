define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  var ScenarioManager = require('intern/dojo/node!../fixtures/scenarioManager');
  var fs = require('intern/dojo/node!fs');
  var pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');
  var Common = require('../support/pages/Common');
  var SettingsPage = require('../support/pages/SettingsPage');
  var HeaderPage = require('../support/pages/HeaderPage');
  var DiscoverPage = require('../support/pages/DiscoverPage');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');

  registerSuite(function () {
    var common;
    var settingsPage;
    var headerPage;
    var discoverPage;
    var scenarioManager;

    return {
      setup: function () {
        // curl -XDELETE http://localhost:9200/.kibana
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        headerPage = new HeaderPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        scenarioManager = new ScenarioManager(url.format(config.elasticsearch));

        return common
          .sleep(1000)
          .then(function () {
            return scenarioManager
              .unload('emptyKibana');
          })
          .then(function () {
            return common
              .sleep(2000);
          })
          .then(function () {
            return scenarioManager
              .load('emptyKibana');
          })
          .then(function () {
            return scenarioManager
              .loadIfEmpty('logstashFunctional');
          })
          .then(function () {
            return common
              .sleep(2000);
          });
      },

      'testSavingQuery': function () {
        var remote = this.remote;
        this.timeout = 80000;

        var fromTime = '2015-09-20 06:31:44.000';
        var toTime = '2015-09-21 18:31:44.000';
        // time range in top right uses 'to'
        // time range above chart uses '-'
        var timeRange = 'September 20th 2015, 06:31:44.000 to September 21st 2015, 18:31:44.000';
        var queryName1 = 'Query # 1';

        var expectedChartData = {
          0: 99.90666666666667,
          10: 110.91999999999999,
          20: 94.4,
          30: 97.15333333333334,
          40: 78.27333333333334,
          50: 90.86,
          70: 71.19333333333334,
          60: 67.65333333333334,
          80: 55.06666666666667,
          90: 54.67333333333334,
          100: 46.80666666666667,
          120: 35.00666666666666,
          140: 17.700000000000003,
          160: 13.766666666666666,
          110: 32.64666666666666,
          150: 7.86666666666666,
          130: 19.666666666666657,
          170: 9.833333333333343,
          190: 4.326666666666668,
          180: 5.11333333333333,
          200: 5.11333333333333,
          210: 0.786666666666676,
          230: 1.1800000000000068,
          240: 0.39333333333333087,
          220: 0.39333333333333087,
          250: 2.7533333333333303,
          260: 1.5733333333333235,
          270: 2.3599999999999994,
          280: 3.146666666666661,
          290: 1.9666666666666686,
          310: 5.11333333333333,
          300: 4.719999999999999,
          340: 5.900000000000006,
          330: 13.373333333333335,
          350: 19.273333333333326,
          320: 9.833333333333343,
          370: 30.680000000000007,
          360: 25.959999999999994,
          380: 29.10666666666667,
          390: 41.3,
          400: 43.66,
          410: 59.39333333333333,
          420: 64.50666666666666,
          440: 81.02666666666667,
          430: 77.09333333333333,
          460: 92.43333333333334,
          450: 82.99333333333334,
          480: 94.79333333333334,
          470: 106.98666666666666,
          490: 101.47999999999999,
          500: 103.05333333333333,
          510: 92.04,
          520: 94.4,
          530: 89.68,
          540: 75.91333333333333,
          550: 62.14666666666666,
          560: 58.606666666666655,
          580: 42.480000000000004,
          570: 47.98666666666668,
          600: 31.86,
          590: 35.00666666666666,
          610: 20.453333333333333,
          620: 18.48666666666668,
          630: 7.473333333333329,
          640: 11.406666666666666,
          660: 6.686666666666667,
          650: 5.11333333333333,
          670: 2.7533333333333303,
          680: 3.146666666666661,
          690: 3.146666666666661,
          700: 0.786666666666676,
          710: 0.786666666666676,
          720: 0
        };


        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: ''
          })))
          .then(function () {
            return remote
              // IMPORTANT!  Changing this size would impact the expected Chart data (please avoid changing)
              .setWindowSize(1011, 800);
          })
          .then(function () {
            common.log('Select Time Field Option @timestamp');
            return settingsPage
              .selectTimeFieldOption('@timestamp');
          })
          .then(function () {
            common.log('Click Create button');
            return settingsPage
              .clickCreateButton();
          })
          .then(function () {
            common.log('Click Default Index button');
            return settingsPage
              .clickDefaultIndexButton();
          })
          .then(function () {
            common.log('Click Discover Tab');
            return headerPage
              .clickDiscover();
          })
          .then(function () {
            common.log('Wait for spinner done');
            return discoverPage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function () {
            common.log('Wait for spinner done');
            return discoverPage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function () {
            common.log('Click time picker');
            return discoverPage
              .clickTimepicker();
          })
          .then(function () {
            common.log('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return discoverPage
              .setAbsoluteRange(fromTime, toTime);
          })
          .then(function () {
            common.log('Collapse Time Picker pane');
            return discoverPage
              .collapseTimepicker();
          })
          .then(function () {
            common.log('Get the timestamp to verify');
            return discoverPage
              .getTimespanText();
          })
          .then(function (actualTimeString) {
            common.log('actualTimeString = \"' + actualTimeString + '\"');
            expect(actualTimeString).to.be(timeRange);
          })
          .then(function () {
            common.log('Save Search as \"' + queryName1 + '\"');
            return discoverPage
              .saveSearch(queryName1);
          })
          .then(function () {
            common.log('Wait for spinner done');
            return discoverPage
              .getSpinnerDone(); // only matches the hidden spinner
          })
          .then(function () {
            return discoverPage
              .getCurrentQueryName()
              .then(function (name) {
                common.log(name);
              });
          })
          .then(function () {
            return common.tryForTime(5000, function () {
              return discoverPage
                .getCurrentQueryName()
                .then(function (name) {
                  if (name !== queryName1) {
                    throw new Error('waiting for ' + queryName1 + ' got ' + name);
                  } else {
                    common.log('found current query name "' + name + '"');
                    return name;
                  }
                });
            });
          })
          .then(function () {
            common.log(' Get Bar Chart data');
            return discoverPage
              .getBarChartData()
              .then(function (paths) {
                common.log('Verify Bar Chart data');
                common.log('total rectangles found = ' + Object.keys(paths).length +
                  ' Expected (map size) = ' + Object.keys(expectedChartData).length
                );
                common.log('keys = ' + Object.keys(paths));
                /* NOTE: an assert.deepEqual between the 'paths' object and the 'expectedChartData' object
                 ** does work OK for either Chrome or Firefox, but not both because of some slight height differences.
                 ** Rounding didn't seem to fix it, so below we check each value with a tolerance.
                 */
                var barHeightTolerance = 1; // the largest bars are over 100 pixels high so this is less than 1% tolerance
                for (var x in expectedChartData) {
                  if (expectedChartData.hasOwnProperty(x)) {
                    // uncomment for debugging
                    common.log(x + '  Expected: ' + expectedChartData[x] + ' Actual: ' +
                      paths[x] + ' diff =' + (expectedChartData[x] - paths[x]) + '\n');
                    expect(Math.abs(expectedChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
                  }
                }
                common.log('Done');
              });

          });
      }
    };
  });
});
