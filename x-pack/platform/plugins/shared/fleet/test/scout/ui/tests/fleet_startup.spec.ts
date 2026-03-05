/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { setupFleetServer, mockFleetSetupEndpoints } from '../common/api_helpers';

test.describe('Fleet startup', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should create agent policy with System integration', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator('fleet-agent-policies-tab').click();
    await page.testSubj.locator('createAgentPolicyButton').click();
    await page.testSubj
      .locator('createAgentPolicyNameField')
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator('createAgentPolicyNameField').fill(`Test policy ${Date.now()}`);
    await page.testSubj.locator('createAgentPolicyFlyoutBtn').click();
    await expect(
      page.testSubj.locator('agentPoliciesTable').getByRole('link', { name: /Test policy/ })
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should create Fleet Server policy', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator('fleetServerLanding.addFleetServerButton').click();
    await page.testSubj
      .locator('fleetServerFlyoutTab-quickStart')
      .waitFor({ state: 'visible', timeout: 15_000 });
    await expect(page.testSubj.locator('createPolicyBtn')).toBeVisible();
  });
});
