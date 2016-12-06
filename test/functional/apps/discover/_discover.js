
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
      const expectedBarChartData = [ 35, 189, 694, 1347, 1285, 704, 176, 29, 39, 189, 640,
        1276, 1327, 663, 166, 25, 30, 164, 663, 1320, 1270, 681, 188, 27 ];
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

      const expectedBarChartData = [ 4, 7, 16, 23, 38, 87, 132, 159, 248, 320, 349, 376, 380,
        324, 293, 233, 188, 125, 69, 40, 28, 17, 2, 3, 8, 10, 12, 28, 36, 84, 111, 157, 229, 292,
        324, 373, 378, 345, 306, 223, 167, 124, 72, 35, 22, 11, 7, 1, 6, 5, 12, 25, 27, 76, 111, 175,
        228, 294, 358, 372, 366, 344, 276, 213, 201, 113, 72, 39, 36, 12, 7, 3 ];
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Daily', async function () {
      const chartInterval = 'Daily';
      const expectedBarChartData = [ 4757, 4614, 4633 ];
      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.try(async () => {
        await verifyChartData(expectedBarChartData);
      });
    });

    bdd.it('should show correct data for chart interval Weekly', async function () {
      const chartInterval = 'Weekly';
      const expectedBarChartData = [ 4757, 9247 ];

      await PageObjects.discover.setChartInterval(chartInterval);
      await PageObjects.common.try(async () => {
        await verifyChartData(expectedBarChartData);
      });
    });

    bdd.it('browser back button should show previous interval Daily', async function () {
      const expectedChartInterval = 'Daily';
      const expectedBarChartData = [ 4757, 4614, 4633 ];

      await this.remote.goBack();
      await PageObjects.common.try(async function tryingForTime() {
        const actualInterval = await PageObjects.discover.getChartInterval();
        expect(actualInterval).to.be(expectedChartInterval);
      });
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Monthly', async function () {
      const chartInterval = 'Monthly';
      const expectedBarChartData = [ 13129 ];

      await PageObjects.discover.setChartInterval(chartInterval);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Yearly', async function () {
      const chartInterval = 'Yearly';
      const expectedBarChartData = [ 13129 ];

      await PageObjects.discover.setChartInterval(chartInterval);
      await verifyChartData(expectedBarChartData);
    });

    bdd.it('should show correct data for chart interval Auto', async function () {
      const chartInterval = 'Auto';
      const expectedBarChartData = [ 35, 189, 694, 1347, 1285, 704, 176, 29, 39, 189,
        640, 1276, 1327, 663, 166, 25, 30, 164, 663, 1320, 1270, 681, 188, 27 ];

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
