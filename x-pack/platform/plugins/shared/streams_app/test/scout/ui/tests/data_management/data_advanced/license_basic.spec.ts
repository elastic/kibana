/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

const CLASSIC_STREAM = 'logs-classic-license-test';
const WIRED_STREAM = 'logs';

/**
 * Tests that verify enterprise-only features are hidden on the Advanced tab
 * when the user has a basic license.
 *
 * Related issue: https://github.com/elastic/kibana/issues/251524
 * The StreamDescription and StreamDiscoveryConfiguration components should not
 * render when the license doesn't support significant events features.
 */
test.describe('Advanced tab with basic license', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    // Generate logs to create a classic stream
    await generateLogsData(logsSynthtraceEsClient)({ index: CLASSIC_STREAM });
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.deleteStream(CLASSIC_STREAM);
    await logsSynthtraceEsClient.clean();
  });

  test('should NOT show enterprise features on wired stream Advanced tab with basic license', async ({
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
            uid: 'basic-license-test',
            type: 'basic',
            mode: 'basic',
            expiryDateInMillis: 4884310543000,
            status: 'active',
          },
          signature: 'basic-license-signature',
        }),
      })
    );

    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoAdvancedTab(WIRED_STREAM);

    // Verify the Advanced tab is visible
    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible();

    // Verify enterprise-only components are NOT rendered
    // StreamDescription panel should be hidden
    await expect(page.getByText('Stream description')).toBeHidden();

    // StreamDiscoveryConfiguration features/systems should be hidden
    await expect(page.getByText('Feature identification')).toBeHidden();
    await expect(page.getByText('System identification')).toBeHidden();

    // Verify basic components ARE still visible
    // Index Configuration should be visible for wired streams
    await expect(page.getByText('Index configuration')).toBeVisible();
  });

  test('should NOT show enterprise features on classic stream Advanced tab with basic license', async ({
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
            uid: 'basic-license-test',
            type: 'basic',
            mode: 'basic',
            expiryDateInMillis: 4884310543000,
            status: 'active',
          },
          signature: 'basic-license-signature',
        }),
      })
    );

    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoAdvancedTab(CLASSIC_STREAM);

    // Verify the Advanced tab is visible
    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible();
    // Verify we're on the classic stream
    await pageObjects.streams.verifyClassicBadge();

    // Verify enterprise-only components are NOT rendered
    // StreamDescription panel should be hidden
    await expect(page.getByText('Stream description')).toBeHidden();

    // StreamDiscoveryConfiguration features/systems should be hidden
    await expect(page.getByText('Feature identification')).toBeHidden();
    await expect(page.getByText('System identification')).toBeHidden();

    // Verify basic components ARE still visible
    // Delete stream panel should be visible for classic streams
    await expect(page.getByRole('heading', { name: 'Delete stream' })).toBeVisible();
  });
});
