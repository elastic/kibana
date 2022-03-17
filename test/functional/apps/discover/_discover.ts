/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const inspector = getService('inspector');
  const elasticChart = getService('elasticChart');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover test', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });
    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });
    describe('query', function () {
      const queryName1 = 'Query # 1';

      it('should show correct time range string by timepicker', async function () {
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be(PageObjects.timePicker.defaultStartTime);
        expect(time.end).to.be(PageObjects.timePicker.defaultEndTime);
        const rowData = await PageObjects.discover.getDocTableIndex(1);
        log.debug('check the newest doc timestamp in UTC (check diff timezone in last test)');
        expect(rowData).to.contain('Sep 22, 2015 @ 23:50:13.253');
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

      it('renaming a saved query should modify name in breadcrumb', async function () {
        const queryName2 = 'Modified Query # 1';
        await PageObjects.discover.loadSavedSearch(queryName1);
        await PageObjects.discover.saveSearch(queryName2);

        await retry.try(async function () {
          expect(await PageObjects.discover.getCurrentQueryName()).to.be(queryName2);
        });
      });

      it('should show the correct hit count', async function () {
        const expectedHitCount = '14,004';
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
        });
      });

      it('should show correct time range string in chart', async function () {
        const actualTimeString = await PageObjects.discover.getChartTimespan();
        const expectedTimeString = `${PageObjects.timePicker.defaultStartTime} - ${PageObjects.timePicker.defaultEndTime}`;
        expect(actualTimeString).to.be(expectedTimeString);
      });

      it('should modify the time range when a bar is clicked', async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.clickHistogramBar();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Sep 21, 2015 @ 12:00:00.000');
        expect(time.end).to.be('Sep 21, 2015 @ 15:00:00.000');
        await retry.waitForWithTimeout(
          'doc table to contain the right search result',
          1000,
          async () => {
            const rowData = await PageObjects.discover.getDocTableField(1);
            log.debug(`The first timestamp value in doc table: ${rowData}`);
            return rowData.includes('Sep 21, 2015 @ 14:59:08.840');
          }
        );
      });

      it('should modify the time range when the histogram is brushed', async function () {
        // this is the number of renderings of the histogram needed when new data is fetched
        // this needs to be improved
        const renderingCountInc = 2;
        const prevRenderingCount = await elasticChart.getVisualizationRenderingCount();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await retry.waitFor('chart rendering complete', async () => {
          const actualCount = await elasticChart.getVisualizationRenderingCount();
          const expectedCount = prevRenderingCount + renderingCountInc;
          log.debug(
            `renderings before brushing - actual: ${actualCount} expected: ${expectedCount}`
          );
          return actualCount === expectedCount;
        });
        let prevRowData = '';
        // to make sure the table is already rendered
        await retry.try(async () => {
          prevRowData = await PageObjects.discover.getDocTableField(1);
          log.debug(`The first timestamp value in doc table before brushing: ${prevRowData}`);
        });

        await PageObjects.discover.brushHistogram();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await retry.waitFor('chart rendering complete after being brushed', async () => {
          const actualCount = await elasticChart.getVisualizationRenderingCount();
          const expectedCount = prevRenderingCount + renderingCountInc * 2;
          log.debug(
            `renderings after brushing - actual: ${actualCount} expected: ${expectedCount}`
          );
          return actualCount === expectedCount;
        });
        const newDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
        expect(Math.round(newDurationHours)).to.be(26);

        await retry.waitFor('doc table containing the documents of the brushed range', async () => {
          const rowData = await PageObjects.discover.getDocTableField(1);
          log.debug(`The first timestamp value in doc table after brushing: ${rowData}`);
          return prevRowData !== rowData;
        });
      });

      it('should show correct initial chart interval of Auto', async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const actualInterval = await PageObjects.discover.getChartInterval();

        const expectedInterval = 'Auto';
        expect(actualInterval).to.be(expectedInterval);
      });

      it('should not show "no results"', async () => {
        const isVisible = await PageObjects.discover.hasNoResults();
        expect(isVisible).to.be(false);
      });

      it('should reload the saved search with persisted query to show the initial hit count', async function () {
        // apply query some changes
        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('22');
        });

        // reset to persisted state
        await queryBar.clearQuery();
        await PageObjects.discover.clickResetSavedSearchButton();
        const expectedHitCount = '14,004';
        await retry.try(async function () {
          expect(await queryBar.getQueryString()).to.be('');
          expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
        });
      });
    });

    describe('query #2, which has an empty time range', () => {
      const fromTime = 'Jun 11, 1999 @ 09:22:11.000';
      const toTime = 'Jun 12, 1999 @ 11:21:04.000';

      before(async () => {
        log.debug('setAbsoluteRangeForAnotherQuery');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      it('should show "no results"', async () => {
        await retry.waitFor('no results screen is displayed', async function () {
          const isVisible = await PageObjects.discover.hasNoResults();
          return isVisible === true;
        });
      });

      it('should suggest a new time range is picked', async () => {
        const isVisible = await PageObjects.discover.hasNoResultsTimepicker();
        expect(isVisible).to.be(true);
      });
    });

    describe('nested query', () => {
      before(async () => {
        log.debug('setAbsoluteRangeForAnotherQuery');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      it('should support querying on nested fields', async function () {
        await queryBar.setQuery('nestedField:{ child: nestedValue }');
        await queryBar.submitQuery();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('1');
        });
      });
    });

    describe('data-shared-item', function () {
      it('should have correct data-shared-item title and description', async () => {
        const expected = {
          title: 'A Saved Search',
          description: 'A Saved Search Description',
        };

        await retry.try(async () => {
          await PageObjects.discover.loadSavedSearch(expected.title);
          const { title, description } =
            await PageObjects.common.getSharedItemTitleAndDescription();
          expect(title).to.eql(expected.title);
          expect(description).to.eql(expected.description);
        });
      });
    });

    describe('time zone switch', () => {
      it('should show bars in the correct time zone after switching', async function () {
        await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'America/Phoenix' });
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await queryBar.clearQuery();

        log.debug(
          'check that the newest doc timestamp is now -7 hours from the UTC time in the first test'
        );
        const rowData = await PageObjects.discover.getDocTableIndex(1);
        expect(rowData.startsWith('Sep 22, 2015 @ 16:50:13.253')).to.be.ok();
      });
    });

    describe('invalid time range in URL', function () {
      it('should get the default timerange', async function () {
        await PageObjects.common.navigateToUrl('discover', '#/?_g=(time:(from:now-15m,to:null))', {
          useActualUrl: true,
        });
        await PageObjects.header.awaitKibanaChrome();
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('~ 15 minutes ago');
        expect(time.end).to.be('now');
      });
    });

    describe('empty query', function () {
      it('should update the histogram timerange when the query is resubmitted', async function () {
        await kibanaServer.uiSettings.update({
          'timepicker:timeDefaults': '{  "from": "2015-09-18T19:37:13.000Z",  "to": "now"}',
        });
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.awaitKibanaChrome();
        const initialTimeString = await PageObjects.discover.getChartTimespan();
        await queryBar.submitQuery();

        await retry.waitFor('chart timespan to have changed', async () => {
          const refreshedTimeString = await PageObjects.discover.getChartTimespan();
          log.debug(
            `Timestamp before: ${initialTimeString}, Timestamp after: ${refreshedTimeString}`
          );
          return refreshedTimeString !== initialTimeString;
        });
      });
    });

    describe('managing fields', function () {
      it('should add a field, sort by it, remove it and also sorting by it', async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.clickFieldListItemAdd('_score');
        await PageObjects.discover.clickFieldSort('_score', 'Sort Low-High');
        const currentUrlWithScore = await browser.getCurrentUrl();
        expect(currentUrlWithScore).to.contain('_score');
        await PageObjects.discover.clickFieldListItemRemove('_score');
        const currentUrlWithoutScore = await browser.getCurrentUrl();
        expect(currentUrlWithoutScore).not.to.contain('_score');
      });
      it('should add a field with customLabel, sort by it, display it correctly', async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.clickFieldListItemAdd('referer');
        await PageObjects.discover.clickFieldSort('referer', 'Sort A-Z');
        expect(await PageObjects.discover.getDocHeader()).to.have.string('Referer custom');
        expect(await PageObjects.discover.getAllFieldNames()).to.contain('Referer custom');
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('referer');
      });
    });

    describe('refresh interval', function () {
      it('should refetch when autofresh is enabled', async () => {
        const intervalS = 5;
        await PageObjects.timePicker.startAutoRefresh(intervalS);

        const getRequestTimestamp = async () => {
          // check inspector panel request stats for timestamp
          await inspector.open();
          const requestStats = await inspector.getTableData();
          const requestStatsRow = requestStats.filter(
            (r) => r && r[0] && r[0].includes('Request timestamp')
          );
          if (!requestStatsRow || !requestStatsRow[0] || !requestStatsRow[0][1]) {
            return '';
          }
          await inspector.close();
          return requestStatsRow[0][1];
        };

        const requestTimestampBefore = await getRequestTimestamp();
        await retry.waitFor('refetch because of refresh interval', async () => {
          const requestTimestampAfter = await getRequestTimestamp();
          log.debug(
            `Timestamp before: ${requestTimestampBefore}, Timestamp after: ${requestTimestampAfter}`
          );
          return Boolean(requestTimestampAfter) && requestTimestampBefore !== requestTimestampAfter;
        });
      });

      after(async () => {
        await inspector.close();
        await PageObjects.timePicker.pauseAutoRefresh();
      });
    });
  });
}
