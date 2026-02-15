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

test.describe('ALL - Inventory', { tag: [...tags.stateful.classic] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;

  test.beforeEach(async ({ kbnClient, browserAuth }) => {
    const data = await loadSavedQuery(kbnClient);
    savedQueryId = data.saved_object_id;
    savedQueryName = data.id;
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test.afterEach(async ({ kbnClient }) => {
    await cleanupSavedQuery(kbnClient, savedQueryId);
  });

  test('should be able to run the query from Infrastructure', async ({ page, pageObjects }) => {
    test.setTimeout(180_000); // Infrastructure page + osquery query can be slow

    // Navigate to Infrastructure Inventory
    await page.gotoApp('metrics/inventory');
    await waitForPageReady(page);

    // Wait for the waffle map to show host nodes
    await expect(page.testSubj.locator('waffleMap')).toBeVisible({ timeout: 60_000 });

    // Wait for page loading to settle
    await waitForPageReady(page);

    // Dismiss "Want a different view?" dialog if it appears (may cover the waffle map)
    const dismissButton = page.getByText('Dismiss').first();
    if (await dismissButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dismissButton.click();
      await waitForPageReady(page);
    }

    // Host nodes are rendered as buttons with names like "scout-osquery-agent-X..." inside the waffle map
    // Note: The first button in waffleMap is "Group by All" which is NOT a host
    const hostButton = page.testSubj
      .locator('waffleMap')
      .getByRole('button', { name: /scout-osquery-agent/i })
      .first();
    await expect(hostButton).toBeVisible({ timeout: 30_000 });
    await hostButton.click();

    // Wait for the host details flyout/dialog to open
    const hostDialog = page.locator('[role="dialog"]').first();
    await hostDialog.waitFor({ state: 'visible', timeout: 15_000 });

    // Click the Osquery tab in the host details flyout using the role selector
    const osqueryTab = page.getByRole('tab', { name: 'Osquery' });
    await osqueryTab.waitFor({ state: 'visible', timeout: 30_000 });
    await osqueryTab.click();

    // Wait for the osquery content to load within the host flyout
    await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible', timeout: 15_000 });

    // Input query and submit
    await pageObjects.liveQuery.inputQuery('select * from uptime;');
    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();
  });

  test('should be able to run the previously saved query', async ({ page, pageObjects }) => {
    test.setTimeout(180_000); // Infrastructure page + osquery query can be slow

    // Navigate to Infrastructure Inventory
    await page.gotoApp('metrics/inventory');
    await waitForPageReady(page);

    // Wait for the waffle map to show host nodes
    await expect(page.testSubj.locator('waffleMap')).toBeVisible({ timeout: 60_000 });

    // Wait for page loading to settle
    await waitForPageReady(page);

    // Dismiss "Want a different view?" dialog if it appears
    const dismissButton = page.getByText('Dismiss').first();
    if (await dismissButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dismissButton.click();
      await waitForPageReady(page);
    }

    // Host nodes are rendered as buttons with names like "scout-osquery-agent-X..." inside the waffle map
    const hostButton = page.testSubj
      .locator('waffleMap')
      .getByRole('button', { name: /scout-osquery-agent/i })
      .first();
    await expect(hostButton).toBeVisible({ timeout: 30_000 });
    await hostButton.click();

    // Wait for the host details flyout/dialog to open
    const hostDialog = page.locator('[role="dialog"]').first();
    await hostDialog.waitFor({ state: 'visible', timeout: 15_000 });

    // Click the Osquery tab in the host details flyout using the role selector
    const osqueryTab = page.getByRole('tab', { name: 'Osquery' });
    await osqueryTab.waitFor({ state: 'visible', timeout: 30_000 });
    await osqueryTab.click();

    // Wait for the osquery content to load within the host flyout
    await page.testSubj
      .locator('comboBoxInput')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });

    // Select saved query
    const comboBox = page.testSubj.locator('comboBoxInput').first();
    await comboBox.click();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- wait for combobox dropdown to render before typing
    await page.waitForTimeout(500);
    await comboBox.pressSequentially(savedQueryName);
    const option = page.getByRole('option', { name: new RegExp(savedQueryName, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();

    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();
  });
});
