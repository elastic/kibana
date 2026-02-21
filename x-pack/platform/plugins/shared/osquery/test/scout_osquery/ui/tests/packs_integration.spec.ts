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
import { socManagerRole, platformEngineerRole } from '../common/roles';
import {
  cleanupPack,
  loadAgentPolicy,
  cleanupAgentPolicy,
  addOsqueryToAgentPolicy,
  loadPrebuiltPacks,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'ALL - Packs',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    // eslint-disable-next-line playwright/max-nested-describe
    test.describe(
      'Validate that agent policy is removed from pack when agent policy is removed',
      {
        tag: [...tags.stateful.classic],
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

        test('add integration and validate pack policy', async ({ page, kbnUrl, pageObjects }) => {
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
          const option = page
            .getByRole('option', { name: new RegExp(agentPolicyName, 'i') })
            .first();
          await option.waitFor({ state: 'visible', timeout: 15_000 });
          await option.click();

          const saveBtn = page.testSubj.locator('save-pack-button');
          await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
          await saveBtn.click({ force: true });

          // Wait for success
          await expect(
            page.getByText(`Successfully created "${removingPack}" pack`).first()
          ).toBeVisible({ timeout: 30_000 });

          // Navigate to pack and verify policy is set
          await pageObjects.packs.ensureAllPacksVisible();
          await page
            .getByRole('link', { name: removingPack })
            .first()
            .waitFor({ state: 'visible', timeout: 15_000 });
          await page.getByRole('link', { name: removingPack }).first().click();
          await expect(page.getByText(`${removingPack} details`).first()).toBeVisible();
          await page.getByText('Edit').first().click();

          await expect(
            page.testSubj.locator('comboBoxInput').getByText(agentPolicyName)
          ).toBeVisible();

          // Delete the osquery integration from the agent policy
          await page.goto(kbnUrl.get('/app/fleet/policies'));
          await waitForPageReady(page);
          // Wait for Fleet to finish loading
          await page
            .getByText('Loading Fleet...')
            .first()
            .waitFor({ state: 'hidden', timeout: 60_000 })
            .catch(() => {});
          await page
            .getByText(agentPolicyName)
            .first()
            .waitFor({ state: 'visible', timeout: 30_000 });
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
          await pageObjects.packs.ensureAllPacksVisible();
          await page
            .getByRole('link', { name: removingPack })
            .first()
            .waitFor({ state: 'visible', timeout: 15_000 });
          await page.getByRole('link', { name: removingPack }).first().click();
          await expect(page.getByText(`${removingPack} details`).first()).toBeVisible();
          await page.getByText('Edit').first().waitFor({ state: 'visible' });
          await page.getByText('Edit').first().click();

          await expect(
            page.testSubj
              .locator('policyIdsComboBox')
              .locator('[data-test-subj="comboBoxSearchInput"]')
          ).toHaveValue('');
        });
      }
    );

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe.serial(
      'Load prebuilt packs',
      { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
      () => {
        test.beforeAll(async ({ kbnClient }) => {
          await loadPrebuiltPacks(kbnClient);
        });

        test.beforeEach(async ({ browserAuth }) => {
          await browserAuth.loginWithCustomRole(socManagerRole);
        });

        test('should load prebuilt packs', async ({ page }) => {
          await page.gotoApp('osquery/packs');
          await waitForPageReady(page);

          // Load or update prebuilt packs if the button is present (packs may already be loaded)
          const loadBtn = page.getByRole('button', {
            name: /Load Elastic prebuilt packs|Update Elastic prebuilt packs/,
          });
          const isLoadVisible = await loadBtn.isVisible({ timeout: 5_000 }).catch(() => false);

          if (isLoadVisible) {
            await loadBtn.click();
            // Wait for import to complete — button disappears when done
            // eslint-disable-next-line playwright/no-conditional-expect
            await expect(loadBtn).not.toBeVisible({ timeout: 60_000 });
          }

          const rows = page.locator('tbody > tr');
          await rows.first().waitFor({ state: 'visible', timeout: 30_000 });
          expect(await rows.count()).toBeGreaterThan(5);
        });

        test('should be able to activate pack', async ({ page, pageObjects }) => {
          await pageObjects.packs.navigate();
          await pageObjects.packs.ensureAllPacksVisible();
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

          // Dismiss any open popover/dropdown before selecting the pack
          await page.keyboard.press('Escape');

          // Select osquery-monitoring pack
          const packSelect = page.testSubj.locator('select-live-pack');
          const packInput = packSelect.locator('[data-test-subj="comboBoxSearchInput"]');
          await packInput.click();
          await packInput.pressSequentially('osquery-monitoring');
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
      }
    );

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe(
      'Global packs',
      { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
      () => {
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

            // Wait for pack propagation — the global pack is attached asynchronously.
            // Poll until the pack appears in the agent policy (up to 60s).
            let packFound = false;
            for (let attempt = 0; attempt < 12; attempt++) {
              // eslint-disable-next-line playwright/no-wait-for-timeout
              await page.waitForTimeout(5_000);
              const { data: policiesData } = await kbnClient.request({
                method: 'GET',
                path: '/internal/osquery/fleet_wrapper/package_policies',
                headers: { 'elastic-api-version': '1' },
              });
              const item = (policiesData as any).items.find(
                (p: any) => p.policy_id === agentPolicyId
              );
              if (item?.inputs[0]?.config?.osquery?.value?.packs?.[globalPack]) {
                packFound = true;
                break;
              }
            }

            expect(packFound).toBe(true);
          } finally {
            if (globalPackId) {
              await cleanupPack(kbnClient, globalPackId);
            }

            if (agentPolicyId) {
              await cleanupAgentPolicy(kbnClient, agentPolicyId);
            }
          }
        });
      }
    );
  }
);
