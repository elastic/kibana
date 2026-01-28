/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('User with basic license should hit License Paywall', { tag: ['@ess'] }, () => {
  test('Create Integration is not accessible when user is basic', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    // Mock the licensing API to return a basic license
    await page.route('**/api/licensing/info', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          license: {
            uid: 'someId',
            type: 'basic',
            mode: 'basic',
            expiryDateInMillis: 4884310543000,
            status: 'active',
          },
          signature: 'someIdAgain',
        }),
      })
    );

    await browserAuth.loginAsPrivilegedUser();
    const { createIntegrationLanding } = pageObjects;

    await createIntegrationLanding.navigateTo();
    await createIntegrationLanding.waitForPageToLoad();

    // Verify License Paywall Card is visible
    await expect(createIntegrationLanding.getLicensePaywallCard()).toBeVisible();
  });
});
