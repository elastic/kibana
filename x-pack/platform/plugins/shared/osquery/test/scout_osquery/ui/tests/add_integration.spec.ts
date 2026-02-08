/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { platformEngineerRole } from '../common/roles';
import {
  loadSavedQuery,
  cleanupSavedQuery,
  cleanupAgentPolicy,
  loadPack,
  cleanupPack,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

// Failing: See https://github.com/elastic/kibana/issues/170593
test.describe.skip('ALL - Add Integration', { tag: ['@ess', '@svlSecurity'] }, () => {
  let savedQueryId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const sq = await loadSavedQuery(kbnClient);
    savedQueryId = sq.saved_object_id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(platformEngineerRole);
  });

  test.afterAll(async ({ kbnClient }) => {
    if (savedQueryId) {
      await cleanupSavedQuery(kbnClient, savedQueryId);
    }
  });

  test('validate osquery is not available and nav search links to integration', {
    tag: ['@ess'],
  }, async ({ page, kbnUrl }) => {
    // Visit osquery — when not installed, should prompt to add integration
    await page.goto(kbnUrl.get('/app/osquery'));
    await waitForPageReady(page);

    // Intercept the status API to simulate osquery not being installed
    await page.route('**/internal/osquery/status', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ...body, install_status: undefined }),
      });
    });

    await page.reload();
    await waitForPageReady(page);

    await expect(
      page.getByText('Add this integration to run and schedule queries for Elastic Agent.').first()
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Add Osquery Manager').first()).toBeVisible();
    await expect(page.testSubj.locator('osquery-add-integration-button')).toBeVisible();

    // Test nav search
    await page.testSubj.locator('nav-search-input').fill('Osquery');
    await expect(page.locator('[url*="osquery"]').first()).toBeVisible({ timeout: 15_000 });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('Add and upgrade integration', { tag: ['@ess', '@svlSecurity'] }, () => {
    const oldVersion = '0.7.4';
    let policyId: string;

    test.afterEach(async ({ kbnClient }) => {
      if (policyId) {
        await cleanupAgentPolicy(kbnClient, policyId);
      }
    });

    test('should add the old integration and be able to upgrade it', {
      tag: ['@ess'],
    }, async ({ page, kbnUrl }) => {
      test.setTimeout(300_000);

      const integrationName = `integration-${Date.now()}`;
      const policyName = `policy-${Date.now()}`;

      // Visit the old osquery version page
      await page.goto(
        kbnUrl.get(`/app/integrations/detail/osquery_manager-${oldVersion}/overview`)
      );
      await waitForPageReady(page);

      // Add the integration
      await page.testSubj.locator('addIntegrationPolicyButton').click();
      await waitForPageReady(page);

      // Fill in integration name
      const nameInput = page.testSubj.locator('packagePolicyNameInput');
      await nameInput.clear();
      await nameInput.fill(integrationName);

      // Create new agent policy
      await page.testSubj.locator('createAgentPolicyButton').click();
      await page.testSubj.locator('createAgentPolicyNameField').fill(policyName);
      await page.testSubj.locator('createAgentPolicyFlyoutBtn').click();

      // Save the integration policy
      await page.testSubj.locator('createPackagePolicySaveButton').click();

      // Handle "Add Elastic Agent later" if shown
      const addAgentLater = page.getByText('Add Elastic Agent later');
      if (await addAgentLater.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await addAgentLater.click();
      }

      // Verify the integration exists
      await expect(page.getByText(integrationName).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(`version: ${oldVersion}`).first()).toBeVisible();

      // Upgrade the integration
      await page.testSubj.locator('euiFlyoutCloseButton').click();
      await page.testSubj.locator('PackagePoliciesTableUpgradeButton').click();
      await page.testSubj.locator('saveIntegration').click();

      await expect(
        page.getByText(`Successfully updated '${integrationName}'`).first()
      ).toBeVisible({ timeout: 30_000 });

      // Verify old version is gone
      await expect(page.getByText(`version: ${oldVersion}`).first()).not.toBeVisible();
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/170593
  // eslint-disable-next-line playwright/max-nested-describe
  test.describe.skip('Add integration to policy', () => {
    let policyId: string;

    test.afterEach(async ({ kbnClient }) => {
      if (policyId) {
        await cleanupAgentPolicy(kbnClient, policyId);
      }
    });

    test('add integration', async ({ page, kbnUrl }) => {
      test.setTimeout(300_000);
      const integrationName = `integration-${Date.now()}`;
      const policyName = `policy-${Date.now()}`;

      // Create agent policy
      await page.goto(kbnUrl.get('/app/fleet/policies'));
      await waitForPageReady(page);
      await page.testSubj.locator('createAgentPolicyButton').click();
      await page.testSubj.locator('createAgentPolicyNameField').fill(policyName);
      await page.testSubj.locator('createAgentPolicyFlyoutBtn').click();

      await expect(
        page.getByText(`Agent policy '${policyName}' created`).first()
      ).toBeVisible({ timeout: 15_000 });

      // Navigate to the policy and add osquery
      await page.testSubj.locator('agentPolicyNameLink').getByText(policyName).click();
      await page.testSubj.locator('addPackagePolicyButton').click();
      await page.testSubj.locator('epmList.searchBar').fill('osquery');
      await page.testSubj.locator('integration-card:epr:osquery_manager').click();
      await page.testSubj.locator('addIntegrationPolicyButton').click();
      await waitForPageReady(page);

      // Verify the agent policy is pre-selected
      await expect(
        page.testSubj.locator('agentPolicySelect').getByText(policyName)
      ).toBeVisible();

      // Set integration name
      const nameInput = page.testSubj.locator('packagePolicyNameInput');
      await nameInput.clear();
      await nameInput.fill(integrationName);

      await page.testSubj.locator('createPackagePolicySaveButton').click();

      // Cancel the "add agent" modal if it appears
      const cancelBtn = page.testSubj.locator('confirmModalCancelButton');
      if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await cancelBtn.click();
      }

      await expect(page.locator(`[title="${integrationName}"]`)).toBeVisible({ timeout: 15_000 });

      // Navigate to osquery and verify it's accessible
      await page.gotoApp('osquery');
      await waitForPageReady(page);
      await expect(page.getByText('Live queries history').first()).toBeVisible();
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('Upgrade policy with existing packs', () => {
    const oldVersion = '1.2.0';
    let policyId: string;
    let packId: string;

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
      if (policyId) {
        await cleanupAgentPolicy(kbnClient, policyId);
      }
    });

    test('should have integration and packs copied when upgrading integration', async ({
      page,
      kbnUrl,
      kbnClient,
    }) => {
      test.setTimeout(300_000);
      const integrationName = `integration-${Date.now()}`;
      const policyName = `policy-${Date.now()}`;
      const packName = `pack-${Date.now()}`;

      // Install old version of osquery
      await page.goto(
        kbnUrl.get(`/app/integrations/detail/osquery_manager-${oldVersion}/overview`)
      );
      await waitForPageReady(page);

      // Add the integration
      await page.testSubj.locator('addIntegrationPolicyButton').click();
      await waitForPageReady(page);

      const nameInput = page.testSubj.locator('packagePolicyNameInput');
      await nameInput.clear();
      await nameInput.fill(integrationName);

      await page.testSubj.locator('createAgentPolicyButton').click();
      await page.testSubj.locator('createAgentPolicyNameField').fill(policyName);
      await page.testSubj.locator('createAgentPolicyFlyoutBtn').click();

      await page.testSubj.locator('createPackagePolicySaveButton').click();

      const addAgentLater = page.getByText('Add Elastic Agent later');
      if (await addAgentLater.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await addAgentLater.click();
      }

      // Create a pack with this policy
      const { data: policiesResponse } = await kbnClient.request({
        method: 'GET',
        path: '/internal/osquery/fleet_wrapper/package_policies',
        headers: { 'elastic-api-version': '1' },
      });

      const targetPolicy = (policiesResponse as any).items.find(
        (p: any) => p.name === integrationName
      );
      if (targetPolicy) {
        policyId = targetPolicy.policy_id;
      }

      const pack = await loadPack(kbnClient, {
        name: packName,
        policy_ids: targetPolicy ? [targetPolicy.policy_id] : [],
        queries: {
          test_query: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;

      // Navigate to the policy and upgrade
      await page.goto(kbnUrl.get('/app/fleet/policies'));
      await waitForPageReady(page);
      await page.getByText(policyName).first().click();
      await page.testSubj.locator('PackagePoliciesTableUpgradeButton').click();

      // Verify the pack is included in the advanced config
      await page.getByText(/^Advanced$/).first().click();
      await expect(page.locator('.kibanaCodeEditor')).toContainText(`"${packName}"`);

      await page.testSubj.locator('saveIntegration').click();
      await expect(
        page.getByText(`Successfully updated '${integrationName}'`).first()
      ).toBeVisible({ timeout: 30_000 });

      // Verify upgrade removed old version label
      await page.locator(`a[title="${integrationName}"]`).click();
      await page.getByText(/^Advanced$/).first().click();
      await expect(page.locator('.kibanaCodeEditor')).toContainText(`"${packName}"`);

      // Verify prebuilt saved queries exist
      await page.gotoApp('osquery/saved_queries');
      await waitForPageReady(page);
      const rows = page.locator('tbody > tr');
      expect(await rows.count()).toBeGreaterThan(5);
    });
  });
});
