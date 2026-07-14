/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

// Full Kibana access, but scoped to the default space only. This is the crux of
// the test: a space-scoped `base: all` privilege must still hide the Spaces
// management section (managing spaces is a global-only capability). No built-in
// role expresses "all privileges but only in one space", so a custom role is
// required — hence stateful-classic only.
const DEFAULT_SPACE_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['default'] }],
};

test.describe('Spaces feature controls: default space all', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(DEFAULT_SPACE_ALL_ROLE);
  });

  test('can access Stack Management but not the Spaces section', async ({ page, pageObjects }) => {
    await pageObjects.spaces.gotoManagement();

    await expect(page.testSubj.locator('managementHome')).toBeVisible();
    await expect(page.testSubj.locator('spaces')).toBeHidden();
  });

  test('cannot navigate to the spaces grid, create, or edit pages', async ({ page }) => {
    const managementHome = page.testSubj.locator('managementHome');

    await test.step('grid page falls back to management home', async () => {
      await page.gotoApp('management/kibana/spaces');
      await expect(managementHome).toBeVisible();
    });

    await test.step('create page falls back to management home', async () => {
      await page.gotoApp('management/kibana/spaces/create');
      await expect(managementHome).toBeVisible();
    });

    await test.step('edit page falls back to management home', async () => {
      await page.gotoApp('management/kibana/spaces/edit/default');
      await expect(managementHome).toBeVisible();
    });
  });
});
