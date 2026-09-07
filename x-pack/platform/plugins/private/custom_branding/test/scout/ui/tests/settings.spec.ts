/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const CUSTOM_BRANDING_KEYS = [
  'xpackCustomBranding:pageTitle',
  'xpackCustomBranding:logo',
  'xpackCustomBranding:customizedLogo',
] as const;

test.describe('custom branding', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.customBrandingSettings.navigateToGlobalSettings();
  });

  // These settings live on the global config saved object and persist across
  // suites sharing the same Kibana instance, so reset them after each test.
  test.afterEach(async ({ kbnClient }) => {
    for (const key of CUSTOM_BRANDING_KEYS) {
      await kbnClient.request({
        description: `reset global ui setting ${key}`,
        path: `/api/kibana/global_settings/${encodeURIComponent(key)}`,
        method: 'DELETE',
      });
    }
  });

  test('should allow setting custom page title through advanced settings', async ({
    page,
    pageObjects,
  }) => {
    const pageTitle = 'Custom Page Title';

    await pageObjects.customBrandingSettings.setPageTitle(pageTitle);

    await pageObjects.customBrandingSettings.navigateToGlobalSettings();

    const value = page.testSubj.locator(
      'management-settings-editField-xpackCustomBranding:pageTitle'
    );
    await value.waitFor({ state: 'visible' });
    await expect(value).toHaveAttribute('value', pageTitle);
  });

  test('should allow setting custom logo through advanced settings', async ({
    page,
    pageObjects,
  }) => {
    const imagePath = require.resolve('../assets/acme_logo.png');

    await pageObjects.customBrandingSettings.setLogo(imagePath);

    await pageObjects.customBrandingSettings.navigateToGlobalSettings();

    const img = page.locator('img[alt="logo"]');
    await img.waitFor({ state: 'visible' });
    const imgSrc = await img.getAttribute('src');

    expect(imgSrc).toMatch(/^data:image\/png/);
  });

  test('should allow setting custom logo text through advanced settings', async ({
    page,
    pageObjects,
  }) => {
    const imagePath = require.resolve('../assets/acme_text.png');

    await pageObjects.customBrandingSettings.setCustomizedLogo(imagePath);

    await pageObjects.customBrandingSettings.navigateToGlobalSettings();

    const img = page.testSubj.locator('logoMark');
    await img.waitFor({ state: 'visible' });
    const imgSrc = await img.getAttribute('src');

    expect(imgSrc).toMatch(/^data:image\/png/);
  });
});
