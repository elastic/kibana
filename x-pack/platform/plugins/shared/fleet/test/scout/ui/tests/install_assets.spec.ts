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

test.describe('Install assets', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await mockFleetSetupEndpoints(page);
    await browserAuth.loginAsAdmin();
    await page.route('**/api/fleet/epm/packages/**/install**', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            items: [{ name: 'test-package', version: '1.0.0', status: 'installed' }],
          }),
        });
      } else {
        return route.continue();
      }
    });
  });

  test('should show unverified package force-install modal', async ({ page }) => {
    await page.route('**/api/fleet/epm/packages/test-package/1.0.0**', (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          item: {
            name: 'test-package',
            version: '1.0.0',
            verification_status: 'unverified',
          },
        }),
      });
    });

    await page.goto('/app/integrations/detail/test-package-1.0.0/overview');
    await page.testSubj.locator('installAssetsButton').click();
    await expect(
      page.getByRole('heading', { name: /Install unverified integration/ })
    ).toBeVisible();
  });
});
