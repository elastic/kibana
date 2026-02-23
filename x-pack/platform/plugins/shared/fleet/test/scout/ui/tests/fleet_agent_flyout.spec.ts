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
  createAgentDoc,
  insertDocs,
  deleteDocsByQuery,
  cleanupAgentPolicies,
  mockFleetSetupEndpoints,
} from '../common/api_helpers';
import { AGENT_FLYOUT } from '../common/selectors';

test.describe('Add agent flyout', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
    const policy = await createAgentPolicy(kbnClient, `Scout test policy ${Date.now()}`);
    const agentDoc = createAgentDoc('scout-agent-1', policy.id as string, 'online', '8.1.0');
    await insertDocs(esClient, '.fleet-agents', [agentDoc]);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient, esClient }) => {
    try {
      await deleteDocsByQuery(
        esClient,
        '.fleet-agents',
        { match: { 'agent.id': 'scout-agent-1' } },
        { ignoreUnavailable: true }
      );
      await cleanupAgentPolicies(kbnClient);
    } catch {
      // Ignore
    }
  });

  test('should show add agent flyout with Fleet Server already set up', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator('addAgentButton').click();
    await page.testSubj
      .locator(AGENT_FLYOUT.PLATFORM_SELECTOR_EXTENDED)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await expect(page.testSubj.locator(AGENT_FLYOUT.POLICY_DROPDOWN)).toBeVisible();
  });

  test('should show incoming data confirmed after enrollment', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator('addAgentButton').click();
    await page.testSubj
      .locator(AGENT_FLYOUT.PLATFORM_SELECTOR_EXTENDED)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.testSubj.locator(AGENT_FLYOUT.CONFIRM_AGENT_ENROLLMENT_BUTTON).click();
    await expect(page.testSubj.locator(AGENT_FLYOUT.INCOMING_DATA_CONFIRMED_CALL_OUT)).toBeVisible({
      timeout: 30_000,
    });
  });
});
