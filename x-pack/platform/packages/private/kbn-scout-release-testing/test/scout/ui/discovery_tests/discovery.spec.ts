/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout';

const defaultSettings = {
  defaultIndex: 'logstash-*',
  'dateFormat:tz': 'UTC',
};
const defaultStartTime = 'Sep 19, 2015 @ 06:31:44.000';
const defaultEndTime = 'Sep 23, 2015 @ 18:31:44.000';
const endTimeNoResults = 'Sep 19, 2015 @ 18:45:00.000';
const queryName1 = 'Query # 1';
const queryName2 = 'Query # 2';

test.describe('Discover app', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await kbnClient.importExport.load(
      'src/platform/test/functional/fixtures/kbn_archiver/discover'
    );
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    await kbnClient.uiSettings.update(defaultSettings);
  });

  test.beforeEach(async ({ browserAuth, pageObjects, uiSettings }) => {
    await browserAuth.loginAsAdmin();
    await uiSettings.setDefaultTime({
      from: defaultStartTime,
      to: defaultEndTime,
    });
    await pageObjects.discover.goto();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });
  });

  test('should display selected time range in date picker and matching docs in table', async ({
    pageObjects,
  }) => {
    await pageObjects.datePicker.setAbsoluteRange({
      from: defaultStartTime,
      to: defaultEndTime,
    });
    const time = await pageObjects.datePicker.getTimeConfig();
    expect(time.start).toBe(defaultStartTime);
    expect(time.end).toBe(defaultEndTime);

    const rowData = await pageObjects.discover.getDocTableIndex(1);
    expect(rowData).toContain('Sep 22, 2015 @ 23:50:13.253');
  });

  test('save query should show toast message and display query name', async ({ pageObjects }) => {
    await pageObjects.discover.saveSearch(queryName1);
    const actualQueryNameString = await pageObjects.discover.getCurrentQueryName();
    expect(actualQueryNameString).toBe(queryName1);
  });

  test('should refetch when autofresh is enabled', async ({ pageObjects }) => {
    const interval = 5;
    await pageObjects.datePicker.startAutoRefresh(interval);
    const getRequestTimestamp = async () => {
      await pageObjects.inspector.open();
      const requestTimestamp = await pageObjects.inspector.getRequestTimestamp();
      await pageObjects.inspector.close();
      return requestTimestamp;
    };

    const requestTimestampBefore = await getRequestTimestamp();

    await expect
      .poll(
        async () => {
          const requestTimestampAfter = await getRequestTimestamp();
          return Boolean(requestTimestampAfter) && requestTimestampBefore !== requestTimestampAfter;
        },
        { timeout: 7000 }
      )
      .toBe(true);
  });

  test('load query should show query name', async ({ pageObjects }) => {
    await pageObjects.discover.saveSearch(queryName2);
    await pageObjects.discover.loadSavedSearch(queryName2);
    await expect
      .poll(async () => await pageObjects.discover.getCurrentQueryName())
      .toBe(queryName2);
  });

  test('should show the correct hit count', async ({ pageObjects }) => {
    const expectedHitCount = 14004;
    expect(await pageObjects.discover.getHitCountInt()).toBe(expectedHitCount);
  });

  test('should show correct time range string in chart', async ({ pageObjects }) => {
    const actualTimeString = await pageObjects.discover.getChartTimespan();
    const expectedTimeString = `${defaultStartTime} - ${defaultEndTime} (interval: Auto - 3 hours)`;
    expect(actualTimeString).toBe(expectedTimeString);
  });

  test('should modify the time range when a bar is clicked', async ({ pageObjects }) => {
    await pageObjects.discover.clickHistogramBar();
    await pageObjects.discover.waitUntilSearchingHasFinished();

    const time = await pageObjects.datePicker.getTimeConfig();
    expect(time.start).toBe('Sep 21, 2015 @ 09:00:00.000');
    expect(time.end).toBe('Sep 21, 2015 @ 12:00:00.000');

    await expect
      .poll(
        async () => {
          const rowData = await pageObjects.discover.getDocTableField(1);
          return rowData.includes('Sep 21, 2015 @ 11:59:22.316');
        },
        { timeout: 3000 }
      )
      .toBe(true);
  });

  test('should show correct initial chart interval of Auto', async ({ page, pageObjects }) => {
    await page.testSubj.click('discoverQueryHits'); // cancel out tooltips
    const actualInterval = await pageObjects.discover.getChartInterval();
    const expectedInterval = 'auto';
    expect(actualInterval).toBe(expectedInterval);
  });

  test('should show "no results"', async ({ page, pageObjects }) => {
    await pageObjects.datePicker.setAbsoluteRange({
      from: defaultStartTime,
      to: endTimeNoResults,
    });
    await expect(page.testSubj.locator('discoverNoResults')).toBeVisible();
  });

  test('should suggest a new time range is picked', async ({ page, pageObjects, uiSettings }) => {
    await uiSettings.setDefaultTime({
      from: defaultStartTime,
      to: endTimeNoResults,
    });
    await pageObjects.discover.goto();
    await expect(page.testSubj.locator('discoverNoResultsTimefilter')).toBeVisible();
  });

  test('should show matches when time range is expanded', async ({
    page,
    pageObjects,
    uiSettings,
  }) => {
    await uiSettings.setDefaultTime({
      from: defaultStartTime,
      to: endTimeNoResults,
    });
    await pageObjects.discover.goto();
    await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

    await expect(page.testSubj.locator('discoverNoResultsTimefilter')).toBeHidden();
    await expect.poll(async () => await pageObjects.discover.getHitCountInt()).toBeGreaterThan(0);
  });
});
