/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { spaceTest, testData, assertionMessages } from '../fixtures';

spaceTest.describe(
  'Discover app - value suggestions non-time based',
  { tag: ['@ess', '@svlSearch', '@svlOblt'] },
  // TODO: Update to use an ES archive with an index accessible to 'viewer'
  // for running this test against the Security serverless project.
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.NO_TIME_FIELD);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.NO_TIME_FIELD);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest(
      'shows all auto-suggest options for a filter in discover context app',
      async ({ page }) => {
        await page.testSubj.fill('queryInput', 'type.keyword : ');
        await expect(
          page.testSubj.locator('autoCompleteSuggestionText'),
          assertionMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
        ).toHaveCount(1);
        const actualSuggestions = await page.testSubj
          .locator('autoCompleteSuggestionText')
          .allTextContents();
        expect(actualSuggestions.join(',')).toContain('"apache"');
      }
    );
  }
);
