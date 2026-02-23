/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  setupFleetServer,
  createAgentPolicy,
  cleanupAgentPolicies,
  mockFleetSetupEndpoints,
} from '../common/api_helpers';
import { UNINSTALL_TOKENS } from '../common/selectors';

const TARGET_POLICY_ID = 'agent-policy-100';

function generatePolicies(kbnClient: KbnClient) {
  return Promise.all([
    createAgentPolicy(kbnClient, 'Agent policy 100', { id: TARGET_POLICY_ID }),
    createAgentPolicy(kbnClient, 'Agent policy 200', { id: 'agent-policy-200' }),
    createAgentPolicy(kbnClient, 'Agent policy 300', { id: 'agent-policy-300' }),
  ]);
}

function getPolicyRow(page: ScoutPage, policyId: string) {
  return page.testSubj
    .locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)
    .filter({ hasText: policyId })
    .locator('..');
}

test.describe('Uninstall token page', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
    await cleanupAgentPolicies(kbnClient);
    await generatePolicies(kbnClient);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    try {
      await cleanupAgentPolicies(kbnClient);
    } catch {
      // Ignore
    }
  });

  test('should show token by clicking on the eye button', async ({ page }) => {
    await page.goto('/app/fleet/uninstall-tokens');
    const row = getPolicyRow(page, TARGET_POLICY_ID);
    const tokenField = row.locator(page.testSubj.locator(UNINSTALL_TOKENS.TOKEN_FIELD));
    const showHideButton = row.locator(
      page.testSubj.locator(UNINSTALL_TOKENS.SHOW_HIDE_TOKEN_BUTTON)
    );

    await expect(tokenField).toContainText('••••••••••••••••••••••••••••••••');
    await showHideButton.click();
    await expect(tokenField).not.toContainText('••••••••••••••••••••••••••••••••');
  });

  test("should show flyout by clicking on 'View uninstall command' button", async ({
    pageObjects,
  }) => {
    const { uninstallTokens } = pageObjects;
    await uninstallTokens.navigateTo();
    await uninstallTokens.openUninstallCommandFlyout(TARGET_POLICY_ID);
    await expect(uninstallTokens.getUninstallCommandFlyout()).toBeVisible();
    await expect(
      uninstallTokens
        .getUninstallCommandFlyout()
        .getByText(/sudo elastic-agent uninstall --uninstall-token/)
    ).toBeVisible();
  });

  test('should filter for policy ID by partial match', async ({ pageObjects }) => {
    const { uninstallTokens } = pageObjects;
    await uninstallTokens.navigateTo();
    await expect(uninstallTokens.getPolicyIdTableField()).toHaveCount(3, {
      timeout: 10_000,
    });
    await uninstallTokens.getPolicyIdSearchInput().fill('licy-300');
    await expect(uninstallTokens.getPolicyIdTableField()).toHaveCount(1);
  });

  test('should filter for policy name by partial match', async ({ pageObjects }) => {
    const { uninstallTokens } = pageObjects;
    await uninstallTokens.navigateTo();
    await expect(uninstallTokens.getPolicyIdTableField()).toHaveCount(3, {
      timeout: 10_000,
    });
    await uninstallTokens.getPolicyIdSearchInput().fill('Agent 200');
    await expect(uninstallTokens.getPolicyIdTableField()).toHaveCount(1);
  });

  test('should not filter for policy name by partial match when policies are removed', async ({
    kbnClient,
    pageObjects,
  }) => {
    await cleanupAgentPolicies(kbnClient);
    const { uninstallTokens } = pageObjects;
    await uninstallTokens.navigateTo();
    await uninstallTokens.getPolicyIdSearchInput().fill('Agent 200');
    await expect(uninstallTokens.getPolicyIdTableField()).toHaveCount(0);
  });
});
