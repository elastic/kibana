/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { spaceTest, testData, assertionMessages } from '../fixtures';

spaceTest.describe(
  'Discover app - value suggestions: useTimeRange disabled',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    spaceTest.beforeAll(async ({ kbnClient, uiSettings, workerSpace }) => {
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS, {
        space: workerSpace.id,
      });
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH, // TODO: investigate why it is required for `node scripts/playwright_test.js` run
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
        'autocomplete:useTimeRange': false,
      });
    });

    spaceTest.afterAll(async ({ uiSettings, kbnClient, workerSpace }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await uiSettings.set({ 'autocomplete:useTimeRange': true });
      await kbnClient.savedObjects.cleanStandardList({
        space: workerSpace.id,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest('show up if outside of range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_OUT_OF_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        assertionMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });

    spaceTest('show up if in range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        assertionMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });
  }
);
