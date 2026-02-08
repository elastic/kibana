/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadPack, cleanupPack, loadCase, cleanupCase } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

// FLAKY: https://github.com/elastic/kibana/issues/169888
test.describe.skip('ALL - Live Query Packs', { tag: ['@ess', '@svlSecurity'] }, () => {
  let packName: string;
  let packId: string;
  let caseId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const pack = await loadPack(kbnClient, {
      queries: {
        system_memory_linux_elastic: {
          ecs_mapping: {},
          interval: 3600,
          query: 'SELECT * FROM memory_info;',
        },
        system_info_elastic: {
          ecs_mapping: {},
          interval: 3600,
          query: 'SELECT * FROM system_info;',
        },
        failingQuery: {
          ecs_mapping: {},
          interval: 10,
          query: 'select opera_extensions.* from users join opera_extensions using (uid);',
        },
      },
    });
    packId = pack.saved_object_id;
    packName = pack.name;

    const caseData = await loadCase(kbnClient, 'securitySolution');
    caseId = caseData.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test.afterAll(async ({ kbnClient }) => {
    if (packId) {
      await cleanupPack(kbnClient, packId);
    }

    if (caseId) {
      await cleanupCase(kbnClient, caseId);
    }
  });

  test('should run live pack', async ({ page, pageObjects }) => {
    test.setTimeout(300_000);

    await page.gotoApp('osquery');
    await waitForPageReady(page);
    await page.getByText('New live query').first().click();
    await waitForPageReady(page);

    // Switch to pack mode
    await page.getByText('Run a set of queries in a pack.').first().click();

    // The query editor should not be visible in pack mode
    await expect(page.testSubj.locator('kibanaCodeEditor')).not.toBeVisible();

    // Select the pack
    const packSelect = page.testSubj.locator('select-live-pack');
    await packSelect.click();
    await packSelect.pressSequentially(packName);
    const option = page.getByRole('option', { name: new RegExp(packName, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();

    // Verify the pack contains 3 queries
    await expect(page.getByText('This table contains 3 rows.').first()).toBeVisible();
    await expect(page.getByText('system_memory_linux_elastic').first()).toBeVisible();
    await expect(page.getByText('system_info_elastic').first()).toBeVisible();
    await expect(page.getByText('failingQuery').first()).toBeVisible();

    await pageObjects.liveQuery.selectAllAgents();
    await pageObjects.liveQuery.submitQuery();

    // Expand the system_memory_linux_elastic query results
    await page.testSubj.locator('toggleIcon-system_memory_linux_elastic').click();
    await pageObjects.liveQuery.checkResults();

    // Check action items in results
    await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });

    // Check Status tab headers
    await page.getByText('Status').first().click();
    await expect(page.testSubj.locator('tableHeaderCell_status_0')).toBeVisible();
    await expect(page.testSubj.locator('tableHeaderCell_fields.agent_id[0]_1')).toBeVisible();
    await expect(
      page.testSubj.locator('tableHeaderCell__source.action_response.osquery.count_2')
    ).toBeVisible();
    await expect(page.testSubj.locator('tableHeaderCell_fields.error[0]_3')).toBeVisible();

    // Toggle back and add to case
    await page.testSubj.locator('toggleIcon-system_memory_linux_elastic').click();
    await page.testSubj.locator('toggleIcon-system_memory_linux_elastic').click();

    // Add to case
    const addToCaseButton = page.locator('[aria-label="Add to Case"]').first();
    await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
    await addToCaseButton.click();

    await expect(page.getByText('Select case').first()).toBeVisible();
    await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

    // Verify case was updated
    await expect(page.getByText(/Case .+ updated/).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText('View case').first().click();
    await expect(page.getByText('SELECT * FROM memory_info;').first()).toBeVisible();
  });
});
