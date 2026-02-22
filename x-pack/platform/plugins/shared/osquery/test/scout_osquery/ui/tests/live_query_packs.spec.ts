/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadPack, cleanupPack, loadCase, cleanupCase } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'ALL - Live Query Packs',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let packName: string;
    let packId: string;
    let caseId: string;

    test.beforeAll(async ({ kbnClient }) => {
      const pack = await loadPack(kbnClient, {
        queries: {
          system_memory_linux_elastic: {
            ecs_mapping: {},
            interval: 3600,
            platform: 'linux',
            query: 'SELECT * FROM memory_info;',
          },
          system_info_elastic: {
            ecs_mapping: {},
            interval: 3600,
            platform: 'linux,windows,darwin',
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
      await page.testSubj.locator('newLiveQueryButton').click();
      await waitForPageReady(page);

      // Switch to pack mode
      await page.getByRole('button', { name: 'Run a set of queries in a pack.' }).click();

      // The query editor should not be visible in pack mode
      await expect(page.testSubj.locator('kibanaCodeEditor')).not.toBeVisible();

      // Select the pack
      const packSelect = page.testSubj.locator('select-live-pack');
      const packInput = packSelect.locator('[data-test-subj="comboBoxSearchInput"]');
      await packInput.click();
      await packInput.pressSequentially(packName);
      const option = page.getByRole('option', { name: new RegExp(packName, 'i') });
      await option.waitFor({ state: 'visible', timeout: 30_000 });
      await option.click();

      // Verify the pack contains 3 queries (check individual rows directly since
      // EUI table caption "This table contains N rows" is screen-reader only)
      await expect(page.getByText('system_memory_linux_elastic')).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText('system_info_elastic')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('failingQuery')).toBeVisible({
        timeout: 15_000,
      });

      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.submitQuery();

      // Expand the system_memory_linux_elastic query results
      await page.testSubj
        .locator('toggleIcon-system_memory_linux_elastic')
        .waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('toggleIcon-system_memory_linux_elastic').click();
      await pageObjects.liveQuery.checkResults();

      // Check action items in results
      // eslint-disable-next-line playwright/no-nth-methods -- first visible result in expanded pack query row
      await expect(page.testSubj.locator('viewInLens').first()).toBeVisible({ timeout: 30_000 });
      // eslint-disable-next-line playwright/no-nth-methods -- first visible result in expanded pack query row
      await expect(page.testSubj.locator('viewInDiscover').first()).toBeVisible({
        timeout: 30_000,
      });
      // eslint-disable-next-line playwright/no-nth-methods -- first visible result in expanded pack query row
      await expect(page.testSubj.locator('addToCaseButton').first()).toBeVisible({
        timeout: 30_000,
      });

      // Check Status tab headers
      await page.getByRole('tab', { name: 'Status' }).click();
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
      // eslint-disable-next-line playwright/no-nth-methods -- first visible result
      const addToCaseButton = page.testSubj.locator('addToCaseButton').first();
      await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
      await addToCaseButton.click();

      await expect(page.getByText('Select case')).toBeVisible();
      await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

      // Verify case was updated
      await expect(
        page.testSubj.locator('globalToastList').getByText(/Case .+ updated/)
      ).toBeVisible({ timeout: 15_000 });
      await page.getByRole('link', { name: 'View case' }).click();
      await expect(page.getByText('SELECT * FROM memory_info;')).toBeVisible();
    });
  }
);
