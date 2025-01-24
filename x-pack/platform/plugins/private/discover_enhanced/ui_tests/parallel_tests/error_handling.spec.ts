/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('Discover app - errors', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.INVALID_SCRIPTED_FIELD);
    await scoutSpace.uiSettings.setDefaultTime({
      from: testData.LOGSTASH_DEFAULT_START_TIME,
      to: testData.LOGSTASH_DEFAULT_END_TIME,
    });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto();
  });

  spaceTest('should render invalid scripted field error', async ({ page }) => {
    await page.testSubj.locator('discoverErrorCalloutTitle').waitFor({ state: 'visible' });
    await expect(
      page.testSubj.locator('painlessStackTrace'),
      'Painless error stacktrace should be displayed'
    ).toBeVisible();
  });
});
