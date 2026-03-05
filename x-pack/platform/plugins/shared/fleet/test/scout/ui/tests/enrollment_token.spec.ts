/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  setupFleetServer,
  createAgentPolicy,
  cleanupAgentPolicies,
  mockFleetSetupEndpoints,
} from '../common/api_helpers';
import { ENROLLMENT_TOKENS } from '../common/selectors';

test.describe('Enrollment token page', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
    await createAgentPolicy(kbnClient, 'Agent policy 1', { id: 'agent-policy-1' });
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

  test('Create new Token', async ({ pageObjects }) => {
    await pageObjects.enrollmentTokens.navigateTo();
    await pageObjects.enrollmentTokens.createToken('New Token', 'Agent policy 1');

    await expect(
      pageObjects.enrollmentTokens.getListTable().getByText('Agent policy 1')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Delete Token - inactivates the token', async ({ page, pageObjects }) => {
    await pageObjects.enrollmentTokens.navigateTo();

    const listTable = pageObjects.enrollmentTokens.getListTable();
    await expect(listTable.getByRole('row')).toHaveCount(2);

    await pageObjects.enrollmentTokens.revokeToken('Agent policy 1');

    await expect(
      page.getByRole('dialog').getByText(/Are you sure you want to revoke/)
    ).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Revoke enrollment token' }).click();

    const row = listTable.getByRole('row', { name: 'Agent policy 1' });
    await expect(
      row.locator(page.testSubj.locator(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN))
    ).not.toBeVisible();
  });
});
