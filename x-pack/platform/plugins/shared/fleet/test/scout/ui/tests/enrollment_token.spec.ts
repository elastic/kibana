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
import { ENROLLMENT_TOKENS, CONFIRM_MODAL } from '../common/selectors';

test.describe('Enrollment token page', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await createAgentPolicy(kbnClient, 'Agent policy 1', { id: 'agent-policy-1' });
  });

  test.afterAll(async ({ kbnClient }) => {
    try {
      await cleanupAgentPolicies(kbnClient);
    } catch {
      // Ignore
    }
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('Create new Token', async ({ page }) => {
    await page.goto('/app/fleet/enrollment-tokens');
    await page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON).click();
    await page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD).clear();
    await page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD).fill('New Token');
    await page.testSubj
      .locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_SELECT_FIELD)
      .locator('input')
      .fill('Agent policy 1');
    await page.getByRole('option').filter({ hasText: 'Agent policy 1' }).first().click();
    await page.testSubj.locator(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    await expect(
      page.testSubj.locator(ENROLLMENT_TOKENS.LIST_TABLE).getByText('Agent policy 1')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Delete Token - inactivates the token', async ({ page }) => {
    await page.goto('/app/fleet/enrollment-tokens');
    await expect(page.testSubj.locator(ENROLLMENT_TOKENS.LIST_TABLE).locator('tr')).toHaveCount(2);
    await page.testSubj.locator(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN).first().click();
    await expect(
      page
        .locator('.euiPanel')
        .getByText(/Are you sure you want to revoke/)
        .first()
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Revoke enrollment token' })
      .first()
      .click({ force: true });

    await expect(
      page.testSubj
        .locator(ENROLLMENT_TOKENS.LIST_TABLE)
        .locator('.euiTableRow')
        .first()
        .locator(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN)
    ).not.toBeVisible();
  });
});
