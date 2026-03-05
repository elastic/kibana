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
  mockFleetSetupEndpoints,
} from '../common/api_helpers';
import { AGENT_FLYOUT, AGENT_POLICY_DETAILS_PAGE } from '../common/selectors';

test.describe('Edit agent policy', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should edit agent policy', async ({ page, kbnClient }) => {
    await createAgentPolicy(kbnClient, 'Agent policy 1', { id: 'policy-1' });

    await page.route('**/api/fleet/agent_policies/policy-1**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            item: {
              id: 'policy-1',
              name: 'Agent policy 1',
              description: '',
              namespace: 'default',
              monitoring_enabled: ['logs', 'metrics'],
              status: 'active',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/app/fleet/policies/policy-1/settings');
    const descInput = page.getByPlaceholder('Optional description');
    await descInput.clear();
    await descInput.fill('desc');

    const updateResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/fleet/agent_policies/policy-1') && res.request().method() === 'PUT'
    );
    await page.getByRole('button', { name: 'Save changes' }).click();
    const response = await updateResponse;
    const body = JSON.parse((await response.request().postData()) ?? '{}');
    expect(body.description).toBe('desc');
  });

  test('should show correct fleet server host for custom URL', async ({
    page,
    kbnClient,
    esClient,
  }) => {
    const kibanaVersion = '8.1.0';
    await setupFleetServer(kbnClient, esClient, kibanaVersion);

    await page.route('**/api/fleet/agent_policies/policy-1**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          item: {
            id: 'policy-1',
            name: 'Agent policy 1',
            description: 'desc',
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
            status: 'active',
            fleet_server_host_id: 'fleet-server-1',
            package_policies: [],
          },
        }),
      });
    });

    const apiKey = {
      id: 'key-1',
      active: true,
      api_key_id: 'PefGQYoB0MXWbqVD6jhr',
      api_key: 'this-is-the-api-key',
      name: 'key-1',
      policy_id: 'policy-1',
      created_at: '2023-08-29T14:51:10.473Z',
    };

    await page.route('**/api/fleet/enrollment_api_keys**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ items: [apiKey], total: 1, page: 1, perPage: 10000 }),
      });
    });

    await page.route('**/internal/fleet/settings/enrollment**', async (route) => {
      const url = route.request().url();
      if (url.includes('agentPolicyId=policy-1')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            fleet_server: {
              policies: [],
              has_active: true,
              host: {
                id: 'fleet-server-1',
                name: 'custom host',
                host_urls: ['https://xxx.yyy.zzz:443'],
                is_default: false,
                is_preconfigured: false,
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await createAgentPolicy(kbnClient, 'Agent policy 1', { id: 'policy-1' });
    await page.goto('/app/fleet/policies/policy-1');
    await page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.ADD_AGENT_LINK).click();
    await page.testSubj.locator(AGENT_FLYOUT.PLATFORM_SELECTOR_EXTENDED).click();
    await page.testSubj.locator(AGENT_FLYOUT.KUBERNETES_PLATFORM_TYPE).click();
    const flyout = page.testSubj.locator('agentEnrollmentFlyout');
    await expect(flyout.getByText('https://xxx.yyy.zzz:443')).toBeVisible();
    await expect(flyout.getByText('this-is-the-api-key')).toBeVisible();
  });
});
