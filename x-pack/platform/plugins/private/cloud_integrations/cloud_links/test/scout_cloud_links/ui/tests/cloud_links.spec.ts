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
  // The billing link requires _ec_billing_admin. Mirror the FTR setup: map the SAML realm to
  // include the role for the duration of this suite, then restore it afterwards.
  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putRoleMapping({
      name: 'cloud-saml-kibana',
      roles: ['superuser', '_ec_billing_admin'],
      enabled: true,
      rules: { field: { 'realm.name': 'cloud-saml-kibana' } },
    });
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.security.invalidateApiKey({ name: 'test-api-key-*' });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.putRoleMapping({
      name: 'cloud-saml-kibana',
      roles: ['superuser'],
      enabled: true,
      rules: { field: { 'realm.name': 'cloud-saml-kibana' } },
    });
  });

  test('connection details overlay shows ES URL and Cloud ID', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('home');
    const welcomeInterstitial = page.testSubj.locator('homeWelcomeInterstitial');
    try {
      await welcomeInterstitial.waitFor({ state: 'visible', timeout: 5000 });
      await page.testSubj.click('skipWelcomeScreen');
      await welcomeInterstitial.waitFor({ state: 'hidden' });
    } catch {
      // welcome screen not present
    }

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

  test('connection details API key can be created', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('home');
    const welcomeInterstitial = page.testSubj.locator('homeWelcomeInterstitial');
    try {
      await welcomeInterstitial.waitFor({ state: 'visible', timeout: 5000 });
      await page.testSubj.click('skipWelcomeScreen');
      await welcomeInterstitial.waitFor({ state: 'hidden' });
    } catch {
      // welcome screen not present
    }

    const { connectionDetails } = pageObjects;
    const keyName = `test-api-key-${Date.now().toString(36)}`;

    await connectionDetails.openFromHelpMenu();
    await connectionDetails.switchToApiKeyTab();
    await connectionDetails.submitApiKeyForm(keyName);

    const apiKeyValue = await connectionDetails.getCreatedApiKeyText();
    expect(apiKeyValue.length).toBeGreaterThan(40);
  });

  test('nav shows "Manage this deployment" link', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('home');
    const welcomeInterstitial = page.testSubj.locator('homeWelcomeInterstitial');
    try {
      await welcomeInterstitial.waitFor({ state: 'visible', timeout: 5000 });
      await page.testSubj.click('skipWelcomeScreen');
      await welcomeInterstitial.waitFor({ state: 'hidden' });
    } catch {
      // welcome screen not present
    }

    await pageObjects.cloudLinks.openNav();
    expect(await pageObjects.cloudLinks.isManageDeploymentLinkVisible()).toBe(true);
  });

  test('user menu shows cloud profile links', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('home');
    const welcomeInterstitial = page.testSubj.locator('homeWelcomeInterstitial');
    try {
      await welcomeInterstitial.waitFor({ state: 'visible', timeout: 5000 });
      await page.testSubj.click('skipWelcomeScreen');
      await welcomeInterstitial.waitFor({ state: 'hidden' });
    } catch {
      // welcome screen not present
    }

    const { cloudLinks } = pageObjects;
    await cloudLinks.openUserMenu();

    await test.step('Profile link is visible', async () => {
      expect(await cloudLinks.isProfileLinkVisible()).toBe(true);
    });

    await test.step('Billing link is visible', async () => {
      expect(await cloudLinks.isBillingLinkVisible()).toBe(true);
    });

    await test.step('Organization link is visible', async () => {
      expect(await cloudLinks.isOrganizationLinkVisible()).toBe(true);
    });

    await test.step('Appearance button is visible', async () => {
      expect(await cloudLinks.isAppearanceButtonVisible()).toBe(true);
    });
  });
});
