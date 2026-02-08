/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */
import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole, platformEngineerRole } from '../common/roles';
import {
  cleanupPack,
  loadAgentPolicy,
  cleanupAgentPolicy,
  addOsqueryToAgentPolicy,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

// Failing: See https://github.com/elastic/kibana/issues/171279
// Failing: See https://github.com/elastic/kibana/issues/180424
test.describe.skip('ALL - Packs', { tag: ['@ess', '@svlSecurity'] }, () => {
  // eslint-disable-next-line playwright/max-nested-describe
  test.describe(
    'Validate that agent policy is removed from pack when agent policy is removed',
    {
      tag: ['@ess'],
    },
    () => {
      let agentPolicyId: string | undefined;
      let agentPolicyName: string;
      let packId: string | undefined;
      const removingPack = `removing-pack-${Date.now()}`;

      test.beforeEach(async ({ browserAuth, kbnClient }) => {
        await browserAuth.loginWithCustomRole(platformEngineerRole);

        // Create an agent policy with osquery
        const agentPolicy = await loadAgentPolicy(kbnClient);
        agentPolicyId = agentPolicy.id;
        agentPolicyName = agentPolicy.name;
        await addOsqueryToAgentPolicy(kbnClient, agentPolicy.id, agentPolicyName);
      });

      test.afterEach(async ({ kbnClient }) => {
        if (packId) {
          await cleanupPack(kbnClient, packId);
        }

        if (agentPolicyId) {
          await cleanupAgentPolicy(kbnClient, agentPolicyId);
        }
      });

      test('add integration and validate pack policy', async ({ page, kbnUrl }) => {
        test.setTimeout(300_000);

        // Create a pack with the agent policy
        await page.gotoApp('osquery/packs');
        await waitForPageReady(page);
        await page.testSubj.locator('add-pack-button').first().click();

        const nameInput = page.locator('input[name="name"]');
        await nameInput.fill(removingPack);

        const policyComboBox = page.testSubj
          .locator('policyIdsComboBox')
          .locator('[data-test-subj="comboBoxInput"]');
        await policyComboBox.click();
        await policyComboBox.pressSequentially(agentPolicyName);
        const option = page.getByRole('option', { name: new RegExp(agentPolicyName, 'i') }).first();
        await option.waitFor({ state: 'visible', timeout: 15_000 });
        await option.click();

        await page.testSubj.locator('save-pack-button').click();

        // Wait for success
        await expect(
          page.getByText(`Successfully created "${removingPack}" pack`).first()
        ).toBeVisible({ timeout: 30_000 });

        // Navigate to pack and verify policy is set
        const paginationButton = page.testSubj.locator('tablePaginationPopoverButton');
        if (await paginationButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await paginationButton.click();
          await page.testSubj.locator('tablePagination-50-rows').click();
        }

        await page.getByRole('link', { name: removingPack }).first().click();
        await expect(page.getByText(`${removingPack} details`).first()).toBeVisible();
        await page.getByText('Edit').first().click();

        await expect(
          page.testSubj.locator('comboBoxInput').getByText(agentPolicyName)
        ).toBeVisible();

        // Delete the osquery integration from the agent policy
        await page.goto(kbnUrl.get('/app/fleet/policies'));
        await waitForPageReady(page);
        await page.getByText(agentPolicyName).first().click();
        await waitForPageReady(page);

        const actionsButton = page
          .locator('.euiTableCellContent .euiPopover [aria-label="Open"]')
          .first();
        await actionsButton.click();
        await page
          .getByText(/^Delete integration$/)
          .first()
          .click();

        // Confirm deletion modal if visible
        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        await expect(page.getByText(/Deleted integration/).first()).toBeVisible({
          timeout: 15_000,
        });

        // Navigate back to pack and verify policy is removed
        await page.gotoApp('osquery/packs');
        await waitForPageReady(page);
        if (await paginationButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await paginationButton.click();
          await page.testSubj.locator('tablePagination-50-rows').click();
        }

        await page.getByRole('link', { name: removingPack }).first().click();
        await expect(page.getByText(`${removingPack} details`).first()).toBeVisible();
        await page.waitForTimeout(1000);
        await page.getByText('Edit').first().click();

        await expect(page.testSubj.locator('comboBoxInput')).toHaveValue('');
      });
    }
  );

  // eslint-disable-next-line playwright/max-nested-describe, @kbn/eslint/scout_max_one_describe
  test.describe('Load prebuilt packs', { tag: ['@ess', '@svlSecurity'] }, () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test('should load prebuilt packs', async ({ page }) => {
      await page.gotoApp('osquery/packs');
      await waitForPageReady(page);

      await page.getByText('Load Elastic prebuilt packs').first().click();
      await expect(page.getByText('Load Elastic prebuilt packs').first()).not.toBeVisible({
        timeout: 30_000,
      });
      await page.waitForTimeout(1000);

      const rows = page.locator('tbody > tr');
      await rows.first().waitFor({ state: 'visible', timeout: 30_000 });
      expect(await rows.count()).toBeGreaterThan(5);
    });

    test('should be able to activate pack', async ({ page, pageObjects }) => {
      await pageObjects.packs.navigate();
      await pageObjects.packs.changePackActiveStatus('it-compliance');
      await pageObjects.packs.changePackActiveStatus('it-compliance');
    });

    test('should be able to run live prebuilt pack', async ({ page, pageObjects }) => {
      test.setTimeout(300_000);

      await page.gotoApp('osquery/live_queries');
      await waitForPageReady(page);
      await page.getByText('New live query').first().click();
      await waitForPageReady(page);

      // Switch to pack mode
      await page.getByText('Run a set of queries in a pack.').first().click();
      await expect(page.testSubj.locator('kibanaCodeEditor')).not.toBeVisible();

      await pageObjects.liveQuery.selectAllAgents();

      // Select osquery-monitoring pack
      const packSelect = page.testSubj.locator('select-live-pack');
      await packSelect.click();
      await packSelect.pressSequentially('osquery-monitoring');
      const option = page.getByRole('option', { name: /osquery-monitoring/i }).first();
      await option.waitFor({ state: 'visible', timeout: 15_000 });
      await option.click();

      await pageObjects.liveQuery.submitQuery();
      await page.testSubj.locator('toggleIcon-events').click();
      await pageObjects.liveQuery.checkResults();

      await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe, @kbn/eslint/scout_max_one_describe
  test.describe('Global packs', { tag: ['@ess', '@svlSecurity'] }, () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(platformEngineerRole);
    });

    test('add global packs to policies', async ({ page, kbnUrl, kbnClient }) => {
      test.setTimeout(300_000);
      const globalPack = `globalPack${Date.now()}`;
      let globalPackId: string | undefined;
      let agentPolicyId: string | undefined;

      try {
        // Create a global pack
        await page.gotoApp('osquery/packs');
        await waitForPageReady(page);
        await page.testSubj.locator('add-pack-button').first().click();

        await page.locator('input[name="name"]').fill(globalPack);
        await expect(page.testSubj.locator('policyIdsComboBox')).toBeVisible();
        await page.testSubj.locator('osqueryPackTypeGlobal').click();
        await expect(page.testSubj.locator('policyIdsComboBox')).not.toBeVisible();
        await page.testSubj.locator('save-pack-button').click();

        await expect(
          page.getByText(`Successfully created "${globalPack}" pack`).first()
        ).toBeVisible({ timeout: 30_000 });

        // Create agent policy with osquery integration
        const agentPolicy = await loadAgentPolicy(kbnClient);
        agentPolicyId = agentPolicy.id;
        await addOsqueryToAgentPolicy(kbnClient, agentPolicy.id, agentPolicy.name);

        // Verify the global pack is attached to the new agent policy
        const { data: policiesData } = await kbnClient.request({
          method: 'GET',
          path: '/internal/osquery/fleet_wrapper/package_policies',
          headers: { 'elastic-api-version': '1' },
        });

        const item = (policiesData as any).items.find((p: any) => p.policy_id === agentPolicyId);
        expect(item?.inputs[0]?.config?.osquery?.value?.packs?.[globalPack]).toBeDefined();
      } finally {
        if (globalPackId) {
          await cleanupPack(kbnClient, globalPackId);
        }

        if (agentPolicyId) {
          await cleanupAgentPolicy(kbnClient, agentPolicyId);
        }
      }
    });
  });
});
