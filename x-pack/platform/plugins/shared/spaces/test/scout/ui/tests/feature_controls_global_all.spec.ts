/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

// `global_all` (base: ['all'], spaces: ['*']) matches the built-in admin role,
// so no custom role is needed here.
test.describe('Spaces feature controls: global all', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('can access the Spaces management section', async ({ pageObjects }) => {
    await pageObjects.spaces.gotoManagement();

    await expect(pageObjects.spaces.managementLandingLocator()).toBeVisible();
    await expect(pageObjects.spaces.managementSpacesEntryLocator()).toBeVisible();
  });

  test('can navigate to the spaces grid, create, and edit pages', async ({ page, pageObjects }) => {
    await test.step('grid page', async () => {
      await page.gotoApp('management/kibana/spaces');
      await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();
    });

    await test.step('create page', async () => {
      await page.gotoApp('management/kibana/spaces/create');
      await expect(pageObjects.spaces.createPageLocator()).toBeVisible();
    });

    await test.step('edit page', async () => {
      await page.gotoApp('management/kibana/spaces/edit/default');
      await expect(pageObjects.spaces.viewPageLocator()).toBeVisible();
    });
  });
});
