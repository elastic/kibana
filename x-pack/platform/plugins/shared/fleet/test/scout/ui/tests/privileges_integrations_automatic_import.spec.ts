/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';
import {
  getAutomaticImportRole,
  getAutomaticImportConnectorNoneRole,
  getAutomaticImportConnectorReadRole,
  getAutomaticImportConnectorAllRole,
} from '../fixtures/services/privileges';

test.describe('Integrations automatic import privileges', { tag: ['@ess'] }, () => {
  const roleCombinations = [
    { fleetRole: 'read', integrationsRole: 'read' },
    { fleetRole: 'read', integrationsRole: 'all' },
    { fleetRole: 'all', integrationsRole: 'read' },
  ];

  for (const { fleetRole, integrationsRole } of roleCombinations) {
    test(`When the user has '${fleetRole}' role for fleet and '${integrationsRole}' role for Integrations, Create Assistant is not accessible`, async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(getAutomaticImportRole(fleetRole, integrationsRole));
      const { createIntegrationLanding } = pageObjects;

      await createIntegrationLanding.navigateToAssistant();
      await createIntegrationLanding.waitForPageToLoad();

      await expect(createIntegrationLanding.getMissingPrivilegesCallOut()).toBeVisible();
    });

    test(`When the user has '${fleetRole}' role for fleet and '${integrationsRole}' role for Integrations, Create upload is not accessible`, async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(getAutomaticImportRole(fleetRole, integrationsRole));
      const { createIntegrationLanding } = pageObjects;

      await createIntegrationLanding.navigateToUpload();
      await createIntegrationLanding.waitForPageToLoad();

      await expect(createIntegrationLanding.getMissingPrivilegesCallOut()).toBeVisible();
    });
  }

  test('With All Integrations and No actions permissions, Create Assistant is not accessible but upload is accessible', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getAutomaticImportConnectorNoneRole());
    const { createIntegrationLanding } = pageObjects;

    await createIntegrationLanding.navigateTo();
    await createIntegrationLanding.waitForPageToLoad();

    await expect(createIntegrationLanding.getAssistantButton()).toHaveCount(0);
    await expect(createIntegrationLanding.getUploadPackageLink()).toBeVisible();
  });

  test('With All Integrations and Read actions permissions, Create Assistant and upload are accessible', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getAutomaticImportConnectorReadRole());
    const { createIntegrationLanding } = pageObjects;

    await createIntegrationLanding.navigateTo();
    await createIntegrationLanding.waitForPageToLoad();

    await expect(createIntegrationLanding.getAssistantButton()).toBeVisible();
    await expect(createIntegrationLanding.getUploadPackageLink()).toBeVisible();
  });

  test('With All Integrations and Read actions permissions, connectors are not accessible', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getAutomaticImportConnectorReadRole());
    const { createIntegrationLanding } = pageObjects;

    await createIntegrationLanding.navigateToAssistant();
    await createIntegrationLanding.waitForPageToLoad();

    await expect(createIntegrationLanding.getConnectorBedrock()).toHaveCount(0);
    await expect(createIntegrationLanding.getConnectorOpenAI()).toHaveCount(0);
    await expect(createIntegrationLanding.getConnectorGemini()).toHaveCount(0);
  });

  test('With All Integrations and All actions permissions, connectors are visible', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getAutomaticImportConnectorAllRole());
    const { createIntegrationLanding } = pageObjects;

    await createIntegrationLanding.navigateToAssistant();
    await createIntegrationLanding.waitForPageToLoad();

    await expect(createIntegrationLanding.getConnectorBedrock()).toBeVisible();
    await expect(createIntegrationLanding.getConnectorOpenAI()).toBeVisible();
    await expect(createIntegrationLanding.getConnectorGemini()).toBeVisible();
  });
});
