/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { createAgentPolicy, cleanupAgentPolicies } from '../common/api_helpers';
import { UNINSTALL_TOKENS } from '../common/selectors';

function generatePolicies(kbnClient: any) {
  return Promise.all([
    createAgentPolicy(kbnClient, 'Agent policy 100', { id: 'agent-policy-100' }),
    createAgentPolicy(kbnClient, 'Agent policy 200', { id: 'agent-policy-200' }),
    createAgentPolicy(kbnClient, 'Agent policy 300', { id: 'agent-policy-300' }),
  ]);
}

test.describe('Uninstall token page', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.describe('When not removing policies before checking uninstall tokens', () => {
    test.beforeAll(async ({ kbnClient }) => {
      await cleanupAgentPolicies(kbnClient);
      await generatePolicies(kbnClient);
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
      await page.route('**/api/fleet/uninstall_tokens/*', (route) => route.continue());
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.TOKEN_FIELD).first()).toContainText(
        '••••••••••••••••••••••••••••••••'
      );
      await page.testSubj.locator(UNINSTALL_TOKENS.SHOW_HIDE_TOKEN_BUTTON).first().click();
      await page.waitForTimeout(2000);
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.TOKEN_FIELD).first()).not.toContainText(
        '••••••••••••••••••••••••••••••••'
      );
    });

    test("should show flyout by clicking on 'View uninstall command' button", async ({ page }) => {
      await page.goto('/app/fleet/uninstall-tokens');
      await page.testSubj.locator(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON).first().click();
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.UNINSTALL_COMMAND_FLYOUT)).toBeVisible();
      await expect(
        page.getByText(/sudo elastic-agent uninstall --uninstall-token/).first()
      ).toBeVisible();
    });

    test('should filter for policy ID by partial match', async ({ page }) => {
      await page.goto('/app/fleet/uninstall-tokens');
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)).toHaveCount(3, {
        timeout: 10_000,
      });
      await page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD).fill('licy-300');
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)).toHaveCount(1);
    });

    test('should filter for policy name by partial match', async ({ page }) => {
      await page.goto('/app/fleet/uninstall-tokens');
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)).toHaveCount(3, {
        timeout: 10_000,
      });
      await page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD).fill('Agent 200');
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)).toHaveCount(1);
    });
  });

  test.describe('When removing policies before checking uninstall tokens', () => {
    test.beforeAll(async ({ kbnClient }) => {
      await cleanupAgentPolicies(kbnClient);
      await generatePolicies(kbnClient);
      await cleanupAgentPolicies(kbnClient);
    });

    test.afterAll(async ({ kbnClient }) => {
      try {
        await cleanupAgentPolicies(kbnClient);
      } catch {
        // Ignore
      }
    });

    test('should not be able to filter for policy name by partial match', async ({ page }) => {
      await page.goto('/app/fleet/uninstall-tokens');
      await page.waitForLoadState('networkidle');
      await page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD).fill('Agent 200');
      await expect(page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)).toHaveCount(0);
    });
  });
});
