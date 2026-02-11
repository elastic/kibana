/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../fixtures';

test.describe('Index details page', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.goto();
  });

  test('Navigates to the index details page from the home page', async ({ pageObjects, log }) => {
    await log.debug('Navigating to the index details page');

    // Display hidden indices to have some rows in the indices table
    await pageObjects.indexManagement.toggleHiddenIndices();

    // Click the first index in the table and wait for the index details page
    await pageObjects.indexManagement.openIndexDetailsPage(0);

    // Verify index details page is loaded
    await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
  });
});
