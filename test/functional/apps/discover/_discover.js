import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'header']);
  const defaultSettings = {
    'dateFormat:tz': 'UTC',
    'defaultIndex': 'logstash-*'
  };

  describe('discover app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const fromTimeString = 'September 19th 2015, 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    const toTimeString = 'September 23rd 2015, 18:31:44.000';

    before(async function () {
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace(defaultSettings);

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      log.debug('setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    describe('query', function () {
      const queryName1 = 'Query # 1';

      it('should show correct time range string by timepicker', async function () {
        const actualTimeString = await PageObjects.discover.getTimespanText();

        const expectedTimeString = `${fromTimeString} to ${toTimeString}`;
        expect(actualTimeString).to.be(expectedTimeString);
      });

      it('save query should show toast message and display query name', async function () {
        await PageObjects.discover.saveSearch(queryName1);
        const actualQueryNameString = await PageObjects.discover.getCurrentQueryName();
        expect(actualQueryNameString).to.be(queryName1);
      });

      it('load query should show query name', async function () {
        await PageObjects.discover.loadSavedSearch(queryName1);

        await retry.try(async function () {
          expect(await PageObjects.discover.getCurrentQueryName()).to.be(queryName1);
        });
      });

      it('should show the correct hit count', async function () {
        const expectedHitCount = '14,004';
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
        });
      });

      it('should show the correct bar chart', async function () {
        const expectedBarChartData = [ 35, 189, 694, 1347, 1285, 704, 176, 29, 39, 189, 640,
          1276, 1327, 663, 166, 25, 30, 164, 663, 1320, 1270, 681, 188, 27 ];
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct time range string in chart', async function () {
        const actualTimeString = await PageObjects.discover.getChartTimespan();

        const expectedTimeString = `${fromTimeString} - ${toTimeString}`;
        expect(actualTimeString).to.be(expectedTimeString);
      });

      it('should show correct initial chart interval of Auto', async function () {
        const actualInterval = await PageObjects.discover.getChartInterval();

        const expectedInterval = 'Auto';
        expect(actualInterval).to.be(expectedInterval);
      });

      it('should show correct data for chart interval Hourly', async function () {
        await PageObjects.discover.setChartInterval('Hourly');

        const expectedBarChartData = [ 4, 7, 16, 23, 38, 87, 132, 159, 248, 320, 349, 376, 380,
          324, 293, 233, 188, 125, 69, 40, 28, 17, 2, 3, 8, 10, 12, 28, 36, 84, 111, 157, 229, 292,
          324, 373, 378, 345, 306, 223, 167, 124, 72, 35, 22, 11, 7, 1, 6, 5, 12, 25, 27, 76, 111, 175,
          228, 294, 358, 372, 366, 344, 276, 213, 201, 113, 72, 39, 36, 12, 7, 3 ];
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Daily', async function () {
        const chartInterval = 'Daily';
        const expectedBarChartData = [ 4757, 4614, 4633 ];
        await PageObjects.discover.setChartInterval(chartInterval);
        await retry.try(async () => {
          await verifyChartData(expectedBarChartData);
        });
      });

      it('should show correct data for chart interval Weekly', async function () {
        const chartInterval = 'Weekly';
        const expectedBarChartData = [ 4757, 9247 ];

        await PageObjects.discover.setChartInterval(chartInterval);
        await retry.try(async () => {
          await verifyChartData(expectedBarChartData);
        });
      });

      it('browser back button should show previous interval Daily', async function () {
        const expectedChartInterval = 'Daily';
        const expectedBarChartData = [ 4757, 4614, 4633 ];

        await remote.goBack();
        await retry.try(async function tryingForTime() {
          const actualInterval = await PageObjects.discover.getChartInterval();
          expect(actualInterval).to.be(expectedChartInterval);
        });
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Monthly', async function () {
        const chartInterval = 'Monthly';
        const expectedBarChartData = [ 13129 ];

        await PageObjects.discover.setChartInterval(chartInterval);
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Yearly', async function () {
        const chartInterval = 'Yearly';
        const expectedBarChartData = [ 13129 ];

        await PageObjects.discover.setChartInterval(chartInterval);
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Auto', async function () {
        const chartInterval = 'Auto';
        const expectedBarChartData = [ 35, 189, 694, 1347, 1285, 704, 176, 29, 39, 189,
          640, 1276, 1327, 663, 166, 25, 30, 164, 663, 1320, 1270, 681, 188, 27 ];

        await PageObjects.discover.setChartInterval(chartInterval);
        await verifyChartData(expectedBarChartData);
      });

      it('should show Auto chart interval', async function () {
        const expectedChartInterval = 'Auto';

        const actualInterval = await PageObjects.discover.getChartInterval();
        expect(actualInterval).to.be(expectedChartInterval);
      });

      it('should not show "no results"', async () => {
        const isVisible = await PageObjects.discover.hasNoResults();
        expect(isVisible).to.be(false);
      });

      async function verifyChartData(expectedBarChartData) {
        await retry.try(async function tryingForTime() {
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
            }
          }
          if (hasFailure) {
            log.debug(stringResults);
            log.debug(paths);
          }
          for (let x = 0; x < expectedBarChartData.length; x++) {
            expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
          }
        });
      }
    });

    describe('query #2, which has an empty time range', function () {
      const fromTime = '1999-06-11 09:22:11.000';
      const toTime = '1999-06-12 11:21:04.000';

      before(() => {
        log.debug('setAbsoluteRangeForAnotherQuery');
        return PageObjects.header
          .setAbsoluteRange(fromTime, toTime);
      });

      it('should show "no results"', async () => {
        const isVisible = await PageObjects.discover.hasNoResults();
        expect(isVisible).to.be(true);
      });

      it('should suggest a new time range is picked', async () => {
        const isVisible = await PageObjects.discover.hasNoResultsTimepicker();
        expect(isVisible).to.be(true);
      });

      it('should have a link that opens and closes the time picker', async function () {
        const noResultsTimepickerLink = await PageObjects.discover.getNoResultsTimepicker();
        expect(await PageObjects.header.isTimepickerOpen()).to.be(false);

        await noResultsTimepickerLink.click();
        expect(await PageObjects.header.isTimepickerOpen()).to.be(true);

        await noResultsTimepickerLink.click();
        expect(await PageObjects.header.isTimepickerOpen()).to.be(false);
      });
    });

    describe('filter editor', function () {
      it('should add a phrases filter', async function () {
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
      });

      it('should show the phrases if you re-open a phrases filter', async function () {
        await filterBar.clickEditFilter('extension.raw', 'jpg');
        const phrases = await filterBar.getFilterEditorPhrases();
        expect(phrases.length).to.be(1);
        expect(phrases[0]).to.be('jpg');
      });
    });

    describe('query language switching', function () {

      after(async function () {
        await kibanaServer.uiSettings.replace(defaultSettings);

        log.debug('discover');
        await PageObjects.common.navigateToApp('discover');
      });

      it('should not show a language switcher by default', async function () {
        const languageSwitcherExists = await queryBar.hasLanguageSwitcher();
        expect(languageSwitcherExists).to.be(false);
      });

      it('should show a language switcher after it has been enabled in the advanced settings', async function () {
        await kibanaServer.uiSettings.update({
          'search:queryLanguage:switcher:enable': true
        });
        await PageObjects.common.navigateToApp('discover');
        const languageSwitcherExists = await queryBar.hasLanguageSwitcher();
        expect(languageSwitcherExists).to.be(true);
      });

      it('should use lucene by default', async function () {
        const currentLanguage = await queryBar.getCurrentLanguage();
        expect(currentLanguage).to.be('lucene');
      });

      it('should allow changing the default language in advanced settings', async function () {
        await kibanaServer.uiSettings.update({
          'search:queryLanguage': 'kuery'
        });
        await PageObjects.common.navigateToApp('discover');

        const languageSwitcherExists = await queryBar.hasLanguageSwitcher();
        expect(languageSwitcherExists).to.be(true);

        const currentLanguage = await queryBar.getCurrentLanguage();
        expect(currentLanguage).to.be('kuery');
      });

      it('should reset the query and filters when the language is switched', async function () {
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.clickFieldListItem('response');
        await PageObjects.discover.clickFieldListPlusFilter('response', 200);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.query('php');
        await PageObjects.header.waitUntilLoadingHasFinished();

        let queryString = await queryBar.getQueryString();
        expect(queryString).to.not.be.empty();

        await queryBar.setLanguage('lucene');
        await PageObjects.header.waitUntilLoadingHasFinished();
        queryString = await queryBar.getQueryString();
        expect(queryString).to.be.empty();
        expect(await filterBar.hasFilter('response', 200)).to.be(false);

        await PageObjects.discover.clickFieldListPlusFilter('response', 200);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.query('php');
        queryString = await queryBar.getQueryString();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(queryString).to.not.be.empty();
        expect(await filterBar.hasFilter('response', 200)).to.be(true);

        await queryBar.setLanguage('kuery');
        await PageObjects.header.waitUntilLoadingHasFinished();
        queryString = await queryBar.getQueryString();
        expect(queryString).to.be.empty();
        expect(await filterBar.hasFilter('response', 200)).to.be(false);
      });

    });

    describe('data-shared-item', function () {
      it('should have correct data-shared-item title and description', async () => {
        const expected = {
          title: 'A Saved Search',
          description: 'A Saved Search Description'
        };

        await retry.try(async () => {
          await PageObjects.discover.loadSavedSearch(expected.title);
          const { title, description } = await PageObjects.common.getSharedItemTitleAndDescription();
          expect(title).to.eql(expected.title);
          expect(description).to.eql(expected.description);
        });
      });
    });
  });
}
