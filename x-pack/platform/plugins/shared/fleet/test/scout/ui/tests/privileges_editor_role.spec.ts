/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

// This role behaves like Fleet > All, Integrations > All
test.describe('When the user has Editor built-in role', { tag: ['@ess'] }, () => {
  test('It should not show a callout if fleet server is setup', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    // Mock the fleet setup API to indicate fleet server is ready
    await page.route('**/api/fleet/agents/setup', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isReady: true,
          is_secrets_storage_enabled: true,
          missing_requirements: [],
          missing_optional_features: [],
        }),
      })
    );

    await browserAuth.loginAsPrivilegedUser();
    const { fleetHome } = pageObjects;

    await fleetHome.navigateTo();
    await fleetHome.waitForPageToLoad();

    // Verify Add Agent button exists
    await expect(fleetHome.getAddAgentButton()).toBeVisible();
  });

  test('It should show a callout with missing privileges if fleet server is not setup', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    // Mock the fleet setup API to indicate fleet server is NOT ready
    await page.route('**/api/fleet/agents/setup', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isReady: true,
          is_secrets_storage_enabled: true,
          missing_requirements: ['fleet_server'],
          missing_optional_features: [],
        }),
      })
    );

    await browserAuth.loginAsPrivilegedUser();
    const { fleetHome } = pageObjects;

    await fleetHome.navigateTo();
    await fleetHome.waitForPageToLoad();

    // Verify Fleet Server Missing Privileges prompt exists
    await expect(fleetHome.getFleetServerMissingPrivilegesPrompt()).toBeVisible();
  });

  test('Integrations are visible and can be added', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { integrationHome } = pageObjects;

    await integrationHome.navigateTo();
    await integrationHome.waitForPageToLoad();

    // Scroll to and click the Apache integration
    await integrationHome.scrollToIntegration('apache');
    await integrationHome.clickIntegrationCard('apache');

    // Verify the Add Integration button is NOT disabled (enabled)
    await expect(integrationHome.getAddIntegrationPolicyButton()).toBeEnabled();
  });
});
