
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('discover app', function describeIndexTests() {
  var fromTime = '2015-09-19 06:31:44.000';
  var fromTimeString = 'September 19th 2015, 06:31:44.000';
  var toTime = '2015-09-23 18:31:44.000';
  var toTimeString = 'September 23rd 2015, 18:31:44.000';

  bdd.before(async function () {
    // delete .kibana index and update configDoc
    await esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'});
    PageObjects.common.debug('load kibana index with default index pattern');
    await elasticDump.elasticLoad('visualize','.kibana');

    // and load a set of makelogs data
    await scenarioManager.loadIfEmpty('logstashFunctional');
    PageObjects.common.debug('discover');
    await PageObjects.common.navigateToApp('discover');
    PageObjects.common.debug('setAbsoluteRange');
    await PageObjects.header.setAbsoluteRange(fromTime, toTime);
  });

  bdd.describe('query', function () {
    var queryName1 = 'Query # 1';

    bdd.it('should show correct time range string by timepicker', async function () {
      var actualTimeString = await PageObjects.discover.getTimespanText();

      expect(actualTimeString).to.be(`${fromTimeString} to ${toTimeString}`);
    });

    bdd.it('save query should show toast message and display query name', async function () {
      await PageObjects.discover.saveSearch(queryName1);
      var toastMessage = await PageObjects.header.getToastMessage();
      await PageObjects.common.saveScreenshot('Discover-save-query-toast');

      expect(toastMessage).to.be(`Discover: Saved Data Source "${queryName1}"`);

      await PageObjects.header.waitForToastMessageGone();
      var actualQueryNameString = await PageObjects.discover.getCurrentQueryName();

      expect(actualQueryNameString).to.be(queryName1);
    });

    bdd.it('load query should show query name', async function () {
      await PageObjects.discover.loadSavedSearch(queryName1);
      await PageObjects.common.sleep(3000);

      var actualQueryNameString = await PageObjects.discover.getCurrentQueryName();
      await PageObjects.common.saveScreenshot('Discover-load-query');
      expect(actualQueryNameString).to.be(queryName1);
    });

    bdd.it('should show the correct hit count', async function () {
      var hitCount = await PageObjects.discover.getHitCount();

      expect(hitCount).to.be('14,004');
    });

    bdd.it('should show the correct bar chart', async function () {
      await PageObjects.common.sleep(4000);

      var expectedBarChartData = [ '3.237',
        '17.674', '64.75', '125.737', '119.962', '65.712', '16.449',
        '2.712', '3.675', '17.674', '59.762', '119.087', '123.812',
        '61.862', '15.487', '2.362', '2.800', '15.312', '61.862', '123.2',
        '118.562', '63.524', '17.587', '2.537'
      ];
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct time range string in chart', async function () {
      var actualTimeString = await PageObjects.discover.getChartTimespan();

      expect(actualTimeString).to.be(`${fromTimeString} - ${toTimeString}`);
    });

    bdd.it('should show correct initial chart interval of 3 hours', async function () {
      var actualInterval = await PageObjects.discover.getChartInterval();

      expect(actualInterval).to.be('by 3 hours');
    });

    bdd.it('should show correct data for chart interval Hourly', async function () {
      await PageObjects.discover.setChartInterval('Hourly');
      await PageObjects.common.sleep(4000);

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
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Daily', async function () {
      var chartInterval = 'Daily';
      var expectedBarChartData = [
        '133.196', '129.192', '129.724'
      ];
      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.try(async () => {
        await verifyChartData(expectedBarChartData);
      });
    });

    bdd.it('should show correct data for chart interval Weekly', async function () {
      var chartInterval = 'Weekly';
      var expectedBarChartData = [ '66.598', '129.458'];

      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.try(async () => {
        await verifyChartData(expectedBarChartData);
      });
    });

    bdd.it('browser back button should show previous interval Daily', async function () {
      var expectedChartInterval = 'Daily';
      var expectedBarChartData = [
        '133.196', '129.192', '129.724'
      ];

      await this.remote.goBack();
      await PageObjects.common.try(async function tryingForTime() {
        var actualInterval = await PageObjects.discover.getChartInterval();
        expect(actualInterval).to.be(expectedChartInterval);
      });
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Monthly', async function () {
      var chartInterval = 'Monthly';
      var expectedBarChartData = [ '122.535'];

      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.sleep(2000);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Yearly', async function () {
      var chartInterval = 'Yearly';
      var expectedBarChartData = [ '122.535'];

      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.sleep(2000);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Auto', async function () {
      var chartInterval = 'Auto';
      var expectedBarChartData = [ '3.237',
        '17.674', '64.75', '125.737', '119.962', '65.712', '16.449',
        '2.712', '3.675', '17.674', '59.762', '119.087', '123.812',
        '61.862', '15.487', '2.362', '2.800', '15.312', '61.862', '123.2',
        '118.562', '63.524', '17.587', '2.537'
      ];

      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.sleep(4000);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show Auto chart interval of 3 hours', async function () {
      var expectedChartInterval = 'by 3 hours';

      var actualInterval = await PageObjects.discover.getChartInterval();
      expect(actualInterval).to.be(expectedChartInterval);
    });

    bdd.it('should not show "no results"', async () => {
      var isVisible = await PageObjects.discover.hasNoResults();
      expect(isVisible).to.be(false);
    });

    async function verifyChartData(expectedBarChartData) {
      await PageObjects.common.try(async function tryingForTime() {
        var paths = await PageObjects.discover.getBarChartData();
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
          PageObjects.common.log(stringResults);
          PageObjects.common.log(paths);
        }
        for (var x = 0; x < expectedBarChartData.length; x++) {
          expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
        }
      });
    }

  });

  bdd.describe('query #2, which has an empty time range', function () {
    var fromTime = '1999-06-11 09:22:11.000';
    var toTime = '1999-06-12 11:21:04.000';

    bdd.before(() => {
      PageObjects.common.debug('setAbsoluteRangeForAnotherQuery');
      return PageObjects.header
        .setAbsoluteRange(fromTime, toTime);
    });

    bdd.it('should show "no results"', async () => {
      var isVisible = await PageObjects.discover.hasNoResults();
      await PageObjects.common.saveScreenshot('Discover-no-results');
      expect(isVisible).to.be(true);
    });

    bdd.it('should suggest a new time range is picked', async () => {
      var isVisible = await PageObjects.discover.hasNoResultsTimepicker();
      expect(isVisible).to.be(true);
    });

    bdd.it('should open and close the time picker', () => {
      let i = 0;

      return closeTimepicker() // close
        .then(() => isTimepickerOpen(false)
          .then(el => el.click()) // open
          .then(() => isTimepickerOpen(true))
          .then(el => el.click()) // close
          .then(() => isTimepickerOpen(false))
          .catch(PageObjects.common.createErrorHandler(this))
        );

      function closeTimepicker() {
        return PageObjects.header.isTimepickerOpen().then(shown => {
          if (!shown) {
            return;
          }
          return PageObjects.discover
            .getNoResultsTimepicker()
            .click(); // close
        });
      }

      function isTimepickerOpen(expected) {
        return PageObjects.header.isTimepickerOpen().then(shown => {
          PageObjects.common.debug(`expect (#${++i}) timepicker to be ${peek(expected)} (is ${peek(shown)}).`);
          expect(shown).to.be(expected);
          return PageObjects.discover.getNoResultsTimepicker();
          function peek(state) {
            return state ? 'open' : 'closed';
          }
        });
      }
    });
  });
});
