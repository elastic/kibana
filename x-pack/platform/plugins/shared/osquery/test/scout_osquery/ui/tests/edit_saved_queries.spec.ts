/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadSavedQuery, cleanupSavedQuery } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'ALL - Edit saved query',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let savedQueryName: string;
    let savedQueryId: string;

    test.beforeAll(async ({ kbnClient }) => {
      const data = await loadSavedQuery(kbnClient);
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test.afterAll(async ({ kbnClient }) => {
      await cleanupSavedQuery(kbnClient, savedQueryId);
    });

    test('by changing ecs mappings and platforms', async ({ page, pageObjects }) => {
      // Navigate to saved queries
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);

      // Click edit on the saved query
      await page.locator(`[aria-label="Edit ${savedQueryName}"]`).click();

      // Verify existing ECS mapping content
      await expect(page.getByText('Custom key/value pairs.').first()).toBeVisible();
      await expect(page.getByText('Hours of uptime').first()).toBeVisible();

      // Delete the ECS mapping row
      const ecsMappingForm = page.testSubj.locator('ECSMappingEditorForm').first();
      await ecsMappingForm.locator('[aria-label="Delete ECS mapping row"]').click();

      // Verify platform checkboxes
      const platformGroup = page.testSubj.locator('osquery-platform-checkbox-group');
      await expect(platformGroup.locator('input[id="linux"]')).toBeChecked();
      await expect(platformGroup.locator('input[id="darwin"]')).toBeChecked();
      await expect(platformGroup.locator('input[id="windows"]')).not.toBeChecked();

      // Check windows checkbox
      await platformGroup.locator('label[for="windows"]').click();

      // Click update
      await page.testSubj.locator('update-query-button').click();

      // Wait for save confirmation toast and the list to reload
      await expect(page.getByText('Successfully saved').first()).toBeVisible({ timeout: 15_000 });
      await waitForPageReady(page);

      // Re-open the saved query to verify changes persisted
      await page.locator(`[aria-label="Edit ${savedQueryName}"]`).waitFor({
        state: 'visible',
        timeout: 15_000,
      });
      await page.locator(`[aria-label="Edit ${savedQueryName}"]`).click();
      await waitForPageReady(page);

      // Verify ECS mapping was removed (text no longer in the DOM)
      await expect(page.getByText('Custom key/value pairs.')).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByText('Hours of uptime')).toHaveCount(0, { timeout: 15_000 });

      // Verify all platforms are now checked
      const platformGroup2 = page.testSubj.locator('osquery-platform-checkbox-group');
      await expect(platformGroup2.locator('input[id="linux"]')).toBeChecked();
      await expect(platformGroup2.locator('input[id="darwin"]')).toBeChecked();
      await expect(platformGroup2.locator('input[id="windows"]')).toBeChecked();
    });
  }
);
