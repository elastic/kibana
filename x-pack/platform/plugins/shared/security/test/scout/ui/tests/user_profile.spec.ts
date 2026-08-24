/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const TEST_USERNAME = 'test_user_profile';
const TEST_PASSWORD = 'changeme';

test.describe('User Profile Page', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putUser({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      roles: ['superuser'],
      full_name: 'test user',
      email: '',
    });
  });

  test.beforeEach(async ({ page, kbnUrl, pageObjects }) => {
    await page.goto(kbnUrl.get('/login'));
    await page.testSubj.locator('loginUsername').fill(TEST_USERNAME);
    await page.testSubj.locator('loginPassword').fill(TEST_PASSWORD);
    await page.testSubj.locator('loginSubmit').click();
    await page.waitForURL(/\/app\//);
    await pageObjects.userProfile.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username: TEST_USERNAME }).catch(() => {});
  });

  test('details: should set the full name', async ({ page, pageObjects }) => {
    const { userProfile } = pageObjects;

    await userProfile.fullNameInput.fill('Test User 2');
    await userProfile.saveProfileChangesButton.click();
    await expect(page.testSubj.locator('globalToastList')).toContainText('Profile updated');
    await page.testSubj.locator('toastCloseButton').click();

    await userProfile.fullNameInput.fill('test user');
    await userProfile.saveProfileChangesButton.click();
    await expect(page.testSubj.locator('globalToastList')).toContainText('Profile updated');
    await page.testSubj.locator('toastCloseButton').click();
  });

  test('details: should set the email', async ({ page, pageObjects }) => {
    const { userProfile } = pageObjects;

    await userProfile.emailInput.fill('test@test.com');
    await userProfile.saveProfileChangesButton.click();
    await expect(page.testSubj.locator('globalToastList')).toContainText('Profile updated');
    await page.testSubj.locator('toastCloseButton').click();

    await userProfile.emailInput.fill('');
    await userProfile.saveProfileChangesButton.click();
    await expect(page.testSubj.locator('globalToastList')).toContainText('Profile updated');
    await page.testSubj.locator('toastCloseButton').click();
  });

  test('change password: should set the current password and enter a new password, then submit', async ({
    page,
    pageObjects,
  }) => {
    const { userProfile } = pageObjects;

    await userProfile.changePasswordButton.click();
    await userProfile.changePasswordCurrentInput.pressSequentially(TEST_PASSWORD);
    await userProfile.changePasswordNewInput.pressSequentially('changeme2');
    await userProfile.changePasswordConfirmInput.pressSequentially('changeme2');
    await userProfile.changePasswordSubmitButton.click();
    await expect(page.testSubj.locator('globalToastList')).toContainText(
      'Password successfully changed'
    );
    await page.testSubj.locator('toastCloseButton').click();

    await userProfile.changePasswordButton.click();
    await userProfile.changePasswordCurrentInput.pressSequentially('changeme2');
    await userProfile.changePasswordNewInput.pressSequentially(TEST_PASSWORD);
    await userProfile.changePasswordConfirmInput.pressSequentially(TEST_PASSWORD);
    await userProfile.changePasswordSubmitButton.click();
    await expect(page.testSubj.locator('globalToastList')).toContainText(
      'Password successfully changed'
    );
    await page.testSubj.locator('toastCloseButton').click();
  });

  test('theme: should change theme based on the User Profile Theme control with default Adv. Settings value (light)', async ({
    pageObjects,
  }) => {
    const { userProfile } = pageObjects;

    await expect(userProfile.themeKeypadMenu).toBeVisible();

    await userProfile.changeTheme('dark');
    expect(await userProfile.getThemeTag()).toBe('borealisdark');

    await userProfile.changeTheme('light');
    expect(await userProfile.getThemeTag()).toBe('borealislight');

    await userProfile.changeTheme('space_default');
    expect(await userProfile.getThemeTag()).toBe('borealislight');
  });

  test('theme: should change theme based on the User Profile Theme control with default Adv. Settings value set to dark', async ({
    uiSettings,
    pageObjects,
  }) => {
    const { userProfile } = pageObjects;

    await uiSettings.set({ 'theme:darkMode': 'enabled' });
    await userProfile.goto();

    expect(await userProfile.getThemeTag()).toBe('borealisdark');

    await userProfile.changeTheme('light');
    expect(await userProfile.getThemeTag()).toBe('borealislight');

    await userProfile.changeTheme('dark');
    expect(await userProfile.getThemeTag()).toBe('borealisdark');

    await userProfile.changeTheme('space_default');
    expect(await userProfile.getThemeTag()).toBe('borealisdark');

    await uiSettings.unset('theme:darkMode');
  });
});
