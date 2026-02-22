/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { dismissAllToasts, waitForPageReady } from '../common/constants';

test.describe(
  'ALL - Packs',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    // eslint-disable-next-line playwright/max-nested-describe -- group has shared beforeEach/afterEach
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
          await page.testSubj.locator('add-pack-button').click();

          const nameInput = page.locator('input[name="name"]');
          await nameInput.fill(removingPack);

          const policyComboBox = page.testSubj
            .locator('policyIdsComboBox')
            .locator('[data-test-subj="comboBoxInput"]');
          await policyComboBox.click();
          await policyComboBox.pressSequentially(agentPolicyName);
          const option = page.getByRole('option', { name: new RegExp(agentPolicyName, 'i') });
          await option.waitFor({ state: 'visible', timeout: 15_000 });
          await option.click();

          const saveBtn = page.testSubj.locator('save-pack-button');
          await saveBtn.scrollIntoViewIfNeeded();
          await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
          await dismissAllToasts(page);

          await Promise.all([
            page.waitForResponse(
              (resp) =>
                resp.url().includes('/api/osquery/packs') && resp.request().method() === 'POST',
              { timeout: 30_000 }
            ),
            saveBtn.click({ force: true }),
          ]);

          await expect(page.getByText(`Successfully created "${removingPack}" pack`)).toBeVisible({
            timeout: 30_000,
          });

          await pageObjects.packs.ensureAllPacksVisible();
          await page
            .getByRole('link', { name: removingPack })
            .waitFor({ state: 'visible', timeout: 15_000 });
          await page.getByRole('link', { name: removingPack }).click();
          await expect(page.getByText(`${removingPack} details`)).toBeVisible();
          await page.getByRole('button', { name: 'Edit' }).click();

          await expect(
            page.testSubj.locator('comboBoxInput').getByText(agentPolicyName)
          ).toBeVisible();

          // Delete the osquery integration from the agent policy
          await page.goto(kbnUrl.get('/app/fleet/policies'));
          await waitForPageReady(page);
          // Wait for Fleet to finish loading
          await page.testSubj
            .locator('fleetSetupLoading')
            .waitFor({ state: 'hidden', timeout: 60_000 })
            .catch(() => {});
          await page
            .getByRole('link', { name: agentPolicyName })
            .waitFor({ state: 'visible', timeout: 30_000 });
          await page.getByRole('link', { name: agentPolicyName }).click();
          await waitForPageReady(page);

          const actionsButton = page.locator(
            '.euiTableCellContent .euiPopover [aria-label="Open"]'
          );
          await actionsButton.click();
          await page.getByRole('button', { name: /^Delete integration$/ }).click();

          // Confirm deletion modal if visible
          const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
          if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmBtn.click();
          }

          await expect(page.getByText(/Deleted integration/)).toBeVisible({
            timeout: 15_000,
          });

          // Navigate back to pack and verify policy is removed
          await page.gotoApp('osquery/packs');
          await waitForPageReady(page);
          await pageObjects.packs.ensureAllPacksVisible();
          await page
            .getByRole('link', { name: removingPack })
            .waitFor({ state: 'visible', timeout: 15_000 });
          await page.getByRole('link', { name: removingPack }).click();
          await expect(page.getByText(`${removingPack} details`)).toBeVisible();
          const editButton = page.getByRole('button', { name: 'Edit' });
          await editButton.waitFor({ state: 'visible' });
          await editButton.click();

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

          const loadBtn = page.getByRole('button', {
            name: /Load Elastic prebuilt packs|Update Elastic prebuilt packs/,
          });
          await loadBtn.click({ timeout: 5_000 }).catch(() => {});
          await expect(loadBtn).not.toBeVisible({ timeout: 60_000 });

          const rows = page.locator('tbody > tr');
          // eslint-disable-next-line playwright/no-nth-methods -- first table row in pack list
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
          await page.testSubj.locator('newLiveQueryButton').click();
          await waitForPageReady(page);

          // Switch to pack mode
          await page.getByRole('radio', { name: /Run a set of queries in a pack/ }).click();
          await expect(page.testSubj.locator('kibanaCodeEditor')).not.toBeVisible();

          await pageObjects.liveQuery.selectAllAgents();

          // Dismiss any open popover/dropdown before selecting the pack
          await page.keyboard.press('Escape');

          // Select osquery-monitoring pack
          const packSelect = page.testSubj.locator('select-live-pack');
          const packInput = packSelect.locator('[data-test-subj="comboBoxSearchInput"]');
          await packInput.click();
          await packInput.pressSequentially('osquery-monitoring');
          const option = page.getByRole('option', { name: /osquery-monitoring/i });
          await option.waitFor({ state: 'visible', timeout: 15_000 });
          await option.click();

          await pageObjects.liveQuery.submitQuery();
          await page.testSubj.locator('toggleIcon-events').click();
          await pageObjects.liveQuery.checkResults();

          // eslint-disable-next-line playwright/no-nth-methods -- first result action button in prebuilt pack
          await expect(page.testSubj.locator('viewInLens').first()).toBeVisible({
            timeout: 30_000,
          });
          // eslint-disable-next-line playwright/no-nth-methods -- first result action button in prebuilt pack
          await expect(page.testSubj.locator('viewInDiscover').first()).toBeVisible({
            timeout: 30_000,
          });
          // eslint-disable-next-line playwright/no-nth-methods -- first result action button in prebuilt pack
          await expect(page.testSubj.locator('addToCaseButton').first()).toBeVisible({
            timeout: 30_000,
          });
        });
      }
    );

    // eslint-disable-next-line playwright/max-nested-describe -- group has shared beforeEach/afterEach
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
            await page.testSubj.locator('add-pack-button').click();

            await page.locator('input[name="name"]').fill(globalPack);
            await expect(page.testSubj.locator('policyIdsComboBox')).toBeVisible();
            await page.testSubj.locator('osqueryPackTypeGlobal').click();
            await expect(page.testSubj.locator('policyIdsComboBox')).not.toBeVisible();
            await page.testSubj.locator('save-pack-button').click();

            await expect(page.getByText(`Successfully created "${globalPack}" pack`)).toBeVisible({
              timeout: 30_000,
            });

            // Create agent policy with osquery integration
            const agentPolicy = await loadAgentPolicy(kbnClient);
            agentPolicyId = agentPolicy.id;
            await addOsqueryToAgentPolicy(kbnClient, agentPolicy.id, agentPolicy.name);

            await expect
              .poll(
                async () => {
                  const { data: policiesData } = await kbnClient.request({
                    method: 'GET',
                    path: '/internal/osquery/fleet_wrapper/package_policies',
                    headers: { 'elastic-api-version': '1' },
                  });
                  const item = (policiesData as any).items.find(
                    (p: any) => p.policy_id === agentPolicyId
                  );

                  return !!item?.inputs[0]?.config?.osquery?.value?.packs?.[globalPack];
                },
                { timeout: 60_000 }
              )
              .toBe(true);
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
