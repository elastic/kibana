/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test, testData } from '../fixtures';

test.describe('API keys management link', { tag: tags.stateful.classic }, () => {
  test('is hidden for a user without API key cluster privileges', async ({ browserAuth, page }) => {
    await browserAuth.loginWithBuiltInRole('kibana_admin');
    await page.gotoApp('management');

    await expect(page.testSubj.locator('mgtSideBarNav')).toBeVisible();
    await expect(page.testSubj.locator('api_keys')).toBeHidden();
  });

  test('is visible for a user who can manage their own API keys', async ({ browserAuth, page }) => {
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    await page.gotoApp('management');

    await expect(page.testSubj.locator('mgtSideBarNav')).toBeVisible();
    await expect(page.testSubj.locator('api_keys')).toBeVisible();
  });
});
