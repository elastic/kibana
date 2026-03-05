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

test.describe('Integrations mock', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsAdmin();
  });

  test('should verify upgrade package and policy flow', async ({ page }) => {
    await page.route('**/api/fleet/epm/packages**', (route) => {
      if (route.request().method() === 'GET' && route.request().url().includes('nginx')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            item: {
              name: 'nginx',
              version: '2.0.0',
              status: 'installed',
              savedObject: { id: 'nginx' },
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto('/app/integrations/detail/nginx/overview');
    await expect(page.testSubj.locator('updatePackageBtn')).toBeVisible({ timeout: 15_000 });
  });
});
