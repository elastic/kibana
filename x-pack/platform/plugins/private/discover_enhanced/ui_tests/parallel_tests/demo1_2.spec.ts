/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe.skip(
  'Discover app - value suggestions: useTimeRange enabled',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    spaceTest.beforeAll(async ({ kbnClient, uiSettings, workerSpace, log }) => {
      log.info(`Creating data view in ${workerSpace.id} space`);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS, {
        space: workerSpace.id,
      });
      log.info(`Updating UI settings in ${workerSpace.id} space`);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH, // TODO: investigate why it is required for `node scripts/playwright_test.js` run
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
      });
    });

    spaceTest.afterAll(async ({ kbnClient, uiSettings, workerSpace }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList({ space: workerSpace.id });
    });

    spaceTest.beforeEach(async ({ browserAuth, page, workerSpace }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(`http://localhost:5620/s/${workerSpace.id}/app/discover`);
    });

    spaceTest('also displays descriptions for operators', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw');
      await expect(page.testSubj.locator('^autocompleteSuggestion-operator')).toHaveCount(2);
    });
  }
);
