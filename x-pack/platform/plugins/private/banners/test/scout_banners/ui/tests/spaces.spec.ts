/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('per-spaces banners', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.spaces.create({
      id: 'another-space',
      name: 'Another Space',
      disabledFeatures: [],
    });
    await kbnClient.uiSettings.update(
      {
        'banners:textContent': 'default space banner text',
      },
      { space: 'default' }
    );
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete('another-space');
    await kbnClient.savedObjects.clean({ types: ['config'] });
  });

  test('displays the space-specific banner within the space', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.app('home'));

    expect(await pageObjects.banners.isTopBannerVisible()).toBe(true);
    expect(await pageObjects.banners.getTopBannerText()).toBe('default space banner text');
  });

  test('displays the global banner within another space', async ({ page, pageObjects, kbnUrl }) => {
    await page.goto(kbnUrl.app('home', { space: 'another-space' }));

    expect(await pageObjects.banners.isTopBannerVisible()).toBe(true);
    expect(await pageObjects.banners.getTopBannerText()).toBe('global banner text');
  });

  test('displays the global banner on the login page', async ({ pageObjects, context }) => {
    await context.clearCookies();
    await pageObjects.login.goto();

    expect(await pageObjects.banners.isTopBannerVisible()).toBe(true);
    expect(await pageObjects.banners.getTopBannerText()).toBe('global banner text');
  });
});
