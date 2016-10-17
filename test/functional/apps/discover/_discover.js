
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('discover app', function describeIndexTests() {
  const fromTime = '2015-09-19 06:31:44.000';
  const fromTimeString = 'September 19th 2015, 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';
  const toTimeString = 'September 23rd 2015, 18:31:44.000';

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
    const queryName1 = 'Query # 1';

    bdd.it('should show correct time range string by timepicker', async function () {
      const actualTimeString = await PageObjects.discover.getTimespanText();

      const expectedTimeString = `${fromTimeString} to ${toTimeString}`;
      expect(actualTimeString).to.be(expectedTimeString);
    });

    bdd.it('save query should show toast message and display query name', async function () {
      await PageObjects.discover.saveSearch(queryName1);
      const toastMessage = await PageObjects.header.getToastMessage();

      const expectedToastMessage = `Discover: Saved Data Source "${queryName1}"`;
      expect(toastMessage).to.be(expectedToastMessage);
      await PageObjects.common.saveScreenshot('Discover-save-query-toast');

      await PageObjects.header.waitForToastMessageGone();
      const actualQueryNameString = await PageObjects.discover.getCurrentQueryName();

      expect(actualQueryNameString).to.be(queryName1);
    });

    bdd.it('load query should show query name', async function () {
      await PageObjects.discover.loadSavedSearch(queryName1);

      await PageObjects.common.try(async function() {
        expect(await PageObjects.discover.getCurrentQueryName()).to.be(queryName1);
      });
      await PageObjects.common.saveScreenshot('Discover-load-query');
    });

    bdd.it('should show the correct hit count', async function () {
      const expectedHitCount = '14,004';
      await PageObjects.common.try(async function() {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });

    bdd.it('should show the correct bar chart', async function () {
      const expectedBarChartData = [ '3.237',
        '17.674', '64.75', '125.737', '119.962', '65.712', '16.449',
        '2.712', '3.675', '17.674', '59.762', '119.087', '123.812',
        '61.862', '15.487', '2.362', '2.800', '15.312', '61.862', '123.2',
        '118.562', '63.524', '17.587', '2.537'
      ];
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct time range string in chart', async function () {
      const actualTimeString = await PageObjects.discover.getChartTimespan();

      const expectedTimeString = `${fromTimeString} - ${toTimeString}`;
      expect(actualTimeString).to.be(expectedTimeString);
    });

    bdd.it('should show correct initial chart interval of 3 hours', async function () {
      const actualInterval = await PageObjects.discover.getChartInterval();

      const expectedInterval = 'by 3 hours';
      expect(actualInterval).to.be(expectedInterval);
    });

    bdd.it('should show correct data for chart interval Hourly', async function () {
      await PageObjects.discover.setChartInterval('Hourly');

      const expectedBarChartData = [ '1.527', '2.290',
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
      const chartInterval = 'Daily';
      const expectedBarChartData = [
        '133.196', '129.192', '129.724'
      ];
      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.try(async () => {
        await verifyChartData(expectedBarChartData);
      });
    });

    bdd.it('should show correct data for chart interval Weekly', async function () {
      const chartInterval = 'Weekly';
      const expectedBarChartData = [ '66.598', '129.458'];

      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.try(async () => {
        await verifyChartData(expectedBarChartData);
      });
    });

    bdd.it('browser back button should show previous interval Daily', async function () {
      const expectedChartInterval = 'Daily';
      const expectedBarChartData = [
        '133.196', '129.192', '129.724'
      ];

      await this.remote.goBack();
      await PageObjects.common.try(async function tryingForTime() {
        const actualInterval = await PageObjects.discover.getChartInterval();
        expect(actualInterval).to.be(expectedChartInterval);
      });
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Monthly', async function () {
      const chartInterval = 'Monthly';
      const expectedBarChartData = [ '122.535'];

      await PageObjects.discover.setChartInterval(chartInterval);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Yearly', async function () {
      const chartInterval = 'Yearly';
      const expectedBarChartData = [ '122.535'];

      await PageObjects.discover.setChartInterval(chartInterval);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Auto', async function () {
      const chartInterval = 'Auto';
      const expectedBarChartData = [ '3.237',
        '17.674', '64.75', '125.737', '119.962', '65.712', '16.449',
        '2.712', '3.675', '17.674', '59.762', '119.087', '123.812',
        '61.862', '15.487', '2.362', '2.800', '15.312', '61.862', '123.2',
        '118.562', '63.524', '17.587', '2.537'
      ];

      await PageObjects.discover.setChartInterval(chartInterval);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show Auto chart interval of 3 hours', async function () {
      const expectedChartInterval = 'by 3 hours';

      const actualInterval = await PageObjects.discover.getChartInterval();
      expect(actualInterval).to.be(expectedChartInterval);
    });

    bdd.it('should not show "no results"', async () => {
      const isVisible = await PageObjects.discover.hasNoResults();
      expect(isVisible).to.be(false);
    });

    async function verifyChartData(expectedBarChartData) {
      await PageObjects.common.try(async function tryingForTime() {
        const paths = await PageObjects.discover.getBarChartData();
        // the largest bars are over 100 pixels high so this is less than 1% tolerance
        const barHeightTolerance = 1;
        let stringResults = '';
        let hasFailure = false;
        for (let y = 0; y < expectedBarChartData.length; y++) {
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
        for (let x = 0; x < expectedBarChartData.length; x++) {
          expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
        }
      });
    }

  });

  bdd.describe('query #2, which has an empty time range', function () {
    const fromTime = '1999-06-11 09:22:11.000';
    const toTime = '1999-06-12 11:21:04.000';

    bdd.before(() => {
      PageObjects.common.debug('setAbsoluteRangeForAnotherQuery');
      return PageObjects.header
        .setAbsoluteRange(fromTime, toTime);
    });

    bdd.it('should show "no results"', async () => {
      const isVisible = await PageObjects.discover.hasNoResults();
      expect(isVisible).to.be(true);
      await PageObjects.common.saveScreenshot('Discover-no-results');
    });

    bdd.it('should suggest a new time range is picked', async () => {
      const isVisible = await PageObjects.discover.hasNoResultsTimepicker();
      expect(isVisible).to.be(true);
    });

    bdd.it('should have a link that opens and closes the time picker', async function() {
      const noResultsTimepickerLink = await PageObjects.discover.getNoResultsTimepicker();
      expect(await PageObjects.header.isTimepickerOpen()).to.be(false);

      await noResultsTimepickerLink.click();
      expect(await PageObjects.header.isTimepickerOpen()).to.be(true);

      await noResultsTimepickerLink.click();
      expect(await PageObjects.header.isTimepickerOpen()).to.be(false);
    });
  });
});
