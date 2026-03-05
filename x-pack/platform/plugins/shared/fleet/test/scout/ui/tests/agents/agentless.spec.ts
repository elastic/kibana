/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../../fixtures';
import { setupFleetServer, createAgentPolicy } from '../../common/api_helpers';

test.describe('Agentless policy', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should not show Add integration button for agentless policy', async ({
    page,
    kbnClient,
  }) => {
    await page.route('**/api/fleet/agent_policies/**', async (route) => {
      const url = route.request().url();
      if (url.includes('policy-1') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            item: {
              id: 'policy-1',
              name: 'Agentless policy',
              description: '',
              namespace: 'default',
              monitoring_enabled: [],
              status: 'active',
              supports_agentless: true,
              package_policies: [],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await createAgentPolicy(kbnClient, 'Agentless policy', { id: 'policy-1' });
    await page.goto('/app/fleet/policies/policy-1');
    await expect(page.testSubj.locator('addPackagePolicyButton')).not.toBeVisible();
  });
});
