/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
// import { CUSTOM_ROLES } from './custom_roles';

test.describe('Index details page', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    // await browserAuth.loginWithCustomRole(CUSTOM_ROLES.indexManagementUser);
    await browserAuth.loginAsAdmin();
    await pageObjects.indexManagement.goto();
  });

  test('Navigates to the index details page from the home page', async ({
    pageObjects,
    log,
    page,
  }) => {
    await log.debug('Navigating to the index details page');

    // Display hidden indices to have some rows in the indices table
    await pageObjects.indexManagement.toggleHiddenIndices();

    // Click the first index in the table and wait for the index details page
    await pageObjects.indexManagement.openIndexDetailsPage(0);

    // Verify index details page is loaded
    await expect(page.testSubj.locator('indexDetailsTab-overview')).toBeVisible();
    await expect(page.testSubj.locator('indexDetailsContent')).toBeVisible();
    await expect(page.testSubj.locator('indexDetailsBackToIndicesButton')).toBeVisible();
  });
});
