/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { createAgentPolicy } from '../common/api_helpers';

test.describe('Package policy', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should edit package policy', async ({ page, kbnClient }) => {
    const policy = await createAgentPolicy(kbnClient, 'Test policy', { id: 'policy-1' });

    await page.route('**/api/fleet/package_policies/**', (route) => route.continue());
    await page.route('**/api/fleet/agent_policies/policy-1**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            item: {
              id: 'policy-1',
              name: 'Test policy',
              package_policies: [
                { id: 'pkg-1', name: 'system-1', package: { name: 'system', version: '1.0.0' } },
              ],
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/app/fleet/policies/policy-1');
    await page.getByRole('link', { name: 'system-1' }).first().click();
    await page.getByRole('button', { name: 'Edit integration' }).first().click();
    const descInput = page.locator('[placeholder="Optional description"]').first();
    await descInput.clear();
    await descInput.fill('Updated description');

    const updatePromise = page.waitForResponse(
      (res) => res.url().includes('/api/fleet/package_policies') && res.request().method() === 'PUT'
    );
    await page.getByRole('button', { name: 'Save integration' }).first().click();
    await updatePromise;
  });
});
