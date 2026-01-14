/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';
import { getFleetAgentsReadIntegrationsNoneRole } from '../fixtures/services/privileges';

test.describe('When the user has Fleet Agents Read built-in role', { tag: ['@ess'] }, () => {
  test('is accessible but user cannot perform any write actions on agent tabs', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getFleetAgentsReadIntegrationsNoneRole());
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

  test('is accessible and user only see agents tab', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(getFleetAgentsReadIntegrationsNoneRole());
    const { fleetHome } = pageObjects;

    await fleetHome.navigateTo();
    await fleetHome.waitForPageToLoad();

    // Verify agents tab exists
    await expect(fleetHome.getAgentsTab()).toBeVisible();

    // Verify other tabs do not exist
    await expect(fleetHome.getAgentPoliciesTab()).toHaveCount(0);
    await expect(fleetHome.getSettingsTab()).toHaveCount(0);
    await expect(fleetHome.getUninstallTokensTab()).toHaveCount(0);
  });
});
