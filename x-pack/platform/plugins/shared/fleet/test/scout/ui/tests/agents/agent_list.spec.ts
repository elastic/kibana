/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../../fixtures';
import {
  setupFleetServer,
  createAgentPolicy,
  createAgentDoc,
  insertDocs,
  deleteDocsByQuery,
  cleanupAgentPolicies,
  mockFleetSetupEndpoints,
} from '../../common/api_helpers';
import { FLEET_AGENT_LIST_PAGE } from '../../common/selectors';

const POLICIES = [
  { id: 'policy-1', name: 'Agent policy 1' },
  { id: 'policy-2', name: 'Agent policy 2' },
  { id: 'policy-3', name: 'Agent policy 3' },
  { id: 'policy-4', name: 'Agent policy 4' },
];

test.describe('View agents list', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await deleteDocsByQuery(
      esClient,
      '.fleet-agents',
      { match_all: {} },
      { ignoreUnavailable: true }
    );
    await cleanupAgentPolicies(kbnClient);
    await setupFleetServer(kbnClient, esClient, '8.1.0');

    const docs = [
      createAgentDoc('agent-1', 'policy-1'),
      createAgentDoc('agent-2', 'policy-2', 'error'),
      createAgentDoc('agent-3', 'policy-3', 'online', '8.1.0', { tags: ['tag1', 'tag2'] }),
      createAgentDoc('agent-4', 'policy-3', 'online', '8.1.0', { tags: ['tag1', 'tag2'] }),
      createAgentDoc('agent-5', 'policy-3', 'online', '8.1.0', { tags: ['tag2'] }),
      createAgentDoc('agent-6', 'policy-3', 'online', '8.1.0', { tags: ['tag2'] }),
      ...Array.from({ length: 11 }, (_, i) => createAgentDoc(`agent-${i + 7}`, 'policy-3')),
    ];
    await insertDocs(esClient, '.fleet-agents', docs);

    for (const p of POLICIES) {
      await createAgentPolicy(kbnClient, p.name, { id: p.id });
    }
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsPrivilegedUser();
    await page.route('**/api/fleet/agents_status', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          total: 18,
          inactive: 0,
          online: 18,
          error: 0,
          offline: 0,
          updating: 0,
          other: 0,
          events: 0,
          orphaned: 0,
          uninstalled: 0,
        }),
      })
    );
  });

  test.afterAll(async ({ kbnClient, esClient }) => {
    try {
      await deleteDocsByQuery(
        esClient,
        '.fleet-agents',
        { match_all: {} },
        { ignoreUnavailable: true }
      );
      await cleanupAgentPolicies(kbnClient);
    } catch {
      // Ignore
    }
  });

  test('should filter based on agent id', async ({ page }) => {
    await page.goto('/app/fleet/agents');
    await page.testSubj.locator(FLEET_AGENT_LIST_PAGE.QUERY_INPUT).fill('agent.id: "agent-1"');
    await page.keyboard.press('Enter');
    await expect(
      page.testSubj.locator(FLEET_AGENT_LIST_PAGE.TABLE).getByText('agent-1')
    ).toBeVisible();
  });

  test('should only show agents with upgrade available after click', async ({ page }) => {
    await page.goto('/app/fleet/agents');
    await page.testSubj.locator(FLEET_AGENT_LIST_PAGE.SHOW_UPGRADEABLE).click();
    await expect(
      page.testSubj.locator(FLEET_AGENT_LIST_PAGE.TABLE).getByText('agent-1')
    ).toBeVisible();
  });

  test('should filter on single policy (no results)', async ({ page }) => {
    await page.goto('/app/fleet/agents');
    await page.testSubj.locator(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();
    await page.getByRole('option', { name: 'Agent policy 4' }).click();
    await expect(
      page.testSubj.locator(FLEET_AGENT_LIST_PAGE.TABLE).getByText('No agents found')
    ).toBeVisible();
  });

  test('should filter on single policy', async ({ page }) => {
    await page.goto('/app/fleet/agents');
    await page.testSubj.locator(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();
    await page.getByRole('option', { name: 'Agent policy 1' }).click();
    await expect(
      page.testSubj.locator(FLEET_AGENT_LIST_PAGE.TABLE).getByText('agent-1')
    ).toBeVisible();
  });
});
