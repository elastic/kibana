/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Security - Login Page', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('can login', async ({ page, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await expect(page.testSubj.locator('userMenuAvatar')).toBeVisible();
  });

  test('displays message if login fails', async ({ page }) => {
    await page.goto('/login');
    await page.testSubj.locator('loginUsername').fill('wrong-user');
    await page.testSubj.locator('loginPassword').fill('wrong-password');
    await page.testSubj.locator('loginSubmit').click();
    const errorMessage = page.testSubj.locator('loginErrorMessage');
    await expect(errorMessage).toContainText('Username or password is incorrect. Please try again.');
  });

  test('displays message acknowledging logout', async ({ page, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await page.goto('/logout');
    await page.testSubj.locator('loginInfoMessage').waitFor({ state: 'visible' });
    await expect(page.testSubj.locator('loginInfoMessage')).toHaveText(
      'You have logged out of Elastic.'
    );
  });

  test('login page has no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.testSubj.locator('loginSubmit').waitFor({ state: 'visible' });
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('logged-in state has no accessibility violations', async ({ page, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('login error state has no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.testSubj.locator('loginUsername').fill('wrong-user');
    await page.testSubj.locator('loginPassword').fill('wrong-password');
    await page.testSubj.locator('loginSubmit').click();
    await page.testSubj.locator('loginErrorMessage').waitFor({ state: 'visible' });
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('logout message has no accessibility violations', async ({ page, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await page.goto('/logout');
    await page.testSubj.locator('loginInfoMessage').waitFor({ state: 'visible' });
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });
});
