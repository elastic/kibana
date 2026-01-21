/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

// This role behaves like Fleet -> None, Integrations -> Read
test.describe('When the user has Viewer built-in role', { tag: ['@ess'] }, () => {
  test('Fleet is accessible but user cannot perform any write actions on agent tabs', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    const { fleetHome } = pageObjects;

    await fleetHome.navigateTo();
    await fleetHome.waitForPageToLoad();

    // Verify agents tab exists
    await expect(fleetHome.getAgentsTab()).toBeVisible();

    // Verify missing privileges prompt does not exist
    await expect(fleetHome.getMissingPrivilegesPromptTitle()).toHaveCount(0);

    // Verify write action buttons do not exist
    await expect(fleetHome.getAddAgentButton()).toHaveCount(0);
    await expect(fleetHome.getAddFleetServerHeader()).toHaveCount(0);
  });

  test('Fleet is accessible but user cannot perform any write actions on agent policies tabs', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    const { fleetHome } = pageObjects;

    await fleetHome.navigateTo();
    await fleetHome.waitForPageToLoad();
    await fleetHome.navigateToAgentPoliciesTab();

    // Verify Create Agent Policy button is not enabled
    await expect(fleetHome.getCreateAgentPolicyButton()).toBeDisabled();
  });

  test('Fleet is accessible but user cannot perform any write actions on settings tabs', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    const { fleetHome } = pageObjects;

    await fleetHome.navigateTo();
    await fleetHome.waitForPageToLoad();
    await fleetHome.navigateToSettingsTab();

    // Verify write action buttons do not exist
    await expect(fleetHome.getAddOutputButton()).toHaveCount(0);
    await expect(fleetHome.getAddFleetServerHostButton()).toHaveCount(0);
  });

  test('Integrations are visible but cannot be added', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    const { integrationHome } = pageObjects;

    await integrationHome.navigateTo();
    await integrationHome.waitForPageToLoad();

    // Scroll to and click the Apache integration
    await integrationHome.scrollToIntegration('apache');
    await integrationHome.clickIntegrationCard('apache');

    // Verify the Add Integration button is disabled
    await expect(integrationHome.getAddIntegrationPolicyButton()).toBeDisabled();
  });
});
