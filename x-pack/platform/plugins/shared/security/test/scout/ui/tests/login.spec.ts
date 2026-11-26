/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Security - Login Page', { tag: tags.stateful.classic }, () => {
  const username = 'scout-login-test-user';
  const password = 'scout-login-test-password';
  const spaceId = 'scout-login-test-space';

  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putUser({ username, password, roles: ['superuser'] });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username });
  });

  test('can login', async ({ page, pageObjects }) => {
    await pageObjects.login.loginWithUsernamePassword(username, password);
    await pageObjects.home.goto();
    await expect(page.testSubj.locator('userMenuAvatar')).toBeVisible();
  });

  test('loads only plugin entries selected for the login page', async ({
    context,
    page,
    pageObjects,
    perfTracker,
    log,
  }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    perfTracker.captureBundleResponses(cdp);
    const requestedPluginEntryIds = new Set<string>();
    cdp.on('Network.requestWillBeSent', ({ request }) => {
      const filename = new URL(request.url).pathname.split('/').pop() ?? '';
      const pluginEntryMatch = filename.match(/^plugin-(.+)\.[a-f0-9]{8,}\.js$/i);
      if (pluginEntryMatch) {
        requestedPluginEntryIds.add(pluginEntryMatch[1]);
      }
    });

    await pageObjects.login.goto();
    await page.testSubj.locator('loginSubmit').waitFor({ state: 'visible' });
    await perfTracker.waitForJsLoad(cdp);

    const stats = perfTracker.collectJsBundleStats(page.url());
    const selectedPluginIds = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __kbnPluginIdsToLoad__?: string[];
          }
        ).__kbnPluginIdsToLoad__ ?? []
    );
    const requestedPluginIds = [...requestedPluginEntryIds].sort();
    log.info(
      `Login requested ${requestedPluginIds.length} plugin entries across ${
        stats.bundleCount
      } JavaScript bundles (${stats.totalSize} transferred bytes): ${requestedPluginIds.join(', ')}`
    );

    expect(selectedPluginIds).toContain('core');
    expect(selectedPluginIds).toContain('security');
    expect(requestedPluginIds).toContain('core');
    expect(requestedPluginIds).toContain('security');
    expect(
      requestedPluginIds.filter((pluginId) => !selectedPluginIds.includes(pluginId))
    ).toStrictEqual([]);
    expect(selectedPluginIds).not.toContain('screenshotMode');
    expect(selectedPluginIds).not.toContain('usageCollection');
    expect(requestedPluginIds).not.toContain('screenshotMode');
    expect(requestedPluginIds).not.toContain('usageCollection');
    expect(requestedPluginIds).not.toContain('dashboard');
    expect(requestedPluginIds).not.toContain('discover');
  });

  test('displays message acknowledging logout', async ({ page, pageObjects }) => {
    await pageObjects.login.loginWithUsernamePassword(username, password);
    await pageObjects.home.goto();
    await page.testSubj.locator('userMenuAvatar').click();
    await page.testSubj.locator('logoutLink').click();
    await expect(page.testSubj.locator('loginInfoMessage')).toHaveText(
      'You have logged out of Elastic.'
    );
  });

  test('logging out of a non-default space redirects to the root login page', async ({
    page,
    pageObjects,
    kbnUrl,
    apiServices,
  }) => {
    await pageObjects.login.loginWithUsernamePassword(username, password);
    await apiServices.spaces.create({ id: spaceId, name: 'Login test space' });
    try {
      await pageObjects.home.goto();
      await page.goto(kbnUrl.app('home', { space: spaceId }));
      await expect(pageObjects.home.homeApp).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/s/${spaceId}/app/home`));
      await page.testSubj.locator('userMenuAvatar').click();
      await page.testSubj.locator('logoutLink').click();
      await expect(page).toHaveURL(
        (url) => url.pathname === new URL(kbnUrl.get('/login')).pathname
      );
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('displays message if login fails', async ({ page, pageObjects }) => {
    await pageObjects.login.goto();
    await page.testSubj.locator('loginUsername').fill('wrong-user');
    await page.testSubj.locator('loginPassword').fill('wrong-password');
    await page.testSubj.locator('loginSubmit').click();
    const errorMessage = page.testSubj.locator('loginErrorMessage');
    await expect(errorMessage).toContainText(
      'Username or password is incorrect. Please try again.'
    );
  });

  test('login page has no accessibility violations', async ({ page, pageObjects }) => {
    await pageObjects.login.goto();
    await page.testSubj.locator('loginSubmit').waitFor({ state: 'visible' });
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('logged-in state has no accessibility violations', async ({ page, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('home');
    await page.testSubj.locator('kbnAppWrapper visibleChrome').waitFor({ state: 'visible' });
    const { violations } = await page.checkA11y({
      include: ['[data-test-subj="kbnAppWrapper visibleChrome"]'],
    });
    expect(violations).toStrictEqual([]);
  });

  test('login error state has no accessibility violations', async ({ page, pageObjects }) => {
    await pageObjects.login.goto();
    await page.testSubj.locator('loginUsername').fill('wrong-user');
    await page.testSubj.locator('loginPassword').fill('wrong-password');
    await page.testSubj.locator('loginSubmit').click();
    await page.testSubj.locator('loginErrorMessage').waitFor({ state: 'visible' });
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });
});
