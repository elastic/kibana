/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { EXPECTED_CLOUD_ID, EXPECTED_ES_URL } from '../fixtures/constants';

test.describe('Cloud Links integration', { tag: tags.stateful.classic }, () => {
  test.afterEach(async ({ esClient }) => {
    await esClient.security.invalidateApiKey({ name: 'test-api-key-*' });
  });

  test('connection details overlay shows ES URL and Cloud ID', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();

    const { connectionDetails } = pageObjects;

    await test.step('open connection details from help menu', async () => {
      await connectionDetails.openFromHelpMenu();
    });

    await test.step('ES URL matches encoded cloud.id', async () => {
      const esUrl = await connectionDetails.getEsUrlText();
      expect(esUrl).toBe(EXPECTED_ES_URL);
    });

    await test.step('Cloud ID is shown after toggling the switch', async () => {
      await connectionDetails.toggleCloudId();
      const cloudId = await connectionDetails.getCloudIdText();
      expect(cloudId).toBe(EXPECTED_CLOUD_ID);
    });
  });

  test('connection details API key can be created', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.home.goto();

    const { connectionDetails } = pageObjects;
    const keyName = `test-api-key-${Date.now().toString(36)}`;

    await connectionDetails.openFromHelpMenu();
    await connectionDetails.switchToApiKeyTab();
    await connectionDetails.submitApiKeyForm(keyName);

    const apiKeyValue = await connectionDetails.getCreatedApiKeyText();
    expect(apiKeyValue.length).toBeGreaterThan(40);
  });

  test('nav shows "Manage this deployment" link', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();

    await pageObjects.cloudLinks.openNav();
    expect(await pageObjects.cloudLinks.isManageDeploymentLinkVisible()).toBe(true);
  });

  test('user menu shows cloud profile links', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.home.goto();

    const { cloudLinks } = pageObjects;
    await cloudLinks.openUserMenu();

    // URLs and the organization ID come from the mocked Scout server config. Configs under `test/scout_*`
    // are excluded from ECH/MKI runs, so asserting exact values is safe here.
    const externalLinks = [
      {
        link: cloudLinks.profileLink,
        label: 'Profile',
        href: 'https://cloud.elastic.co/user/userId',
      },
      {
        link: cloudLinks.billingLink,
        label: 'Billing and subscription',
        href: 'https://cloud.elastic.co/billing#uTargetOrganizationId=org1234567890',
      },
      {
        link: cloudLinks.organizationLink,
        label: 'Organization',
        href: 'https://cloud.elastic.co/organization/organizationId#uTargetOrganizationId=org1234567890',
      },
    ];

    for (const { link, label, href } of externalLinks) {
      await test.step(`${label} link opens Cloud in a new tab`, async () => {
        await expect(link).toBeVisible();
        await expect(link).toContainText(label);
        await expect(link).toHaveAttribute('href', href);
        await expect(link).toHaveAttribute('target', '_blank');
      });
    }

    await test.step('Appearance button is visible', async () => {
      expect(await cloudLinks.isAppearanceButtonVisible()).toBe(true);
    });

    await test.step('Spaces configuration button is visible', async () => {
      expect(await cloudLinks.isSpacesConfigurationButtonVisible()).toBe(true);
    });
  });
});
