/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { type EsClient, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const TEST_USERNAME = `test_user_profile-${randomUUID()}`;
const TEST_PASSWORD = 'changeme';
const UPDATED_PASSWORD = 'changeme2';

const upsertTestUser = async (esClient: EsClient): Promise<void> => {
  await esClient.security.putUser({
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
    // Profile details save uses asCurrentUser.putUser, which needs manage_security.
    roles: ['superuser'],
    full_name: 'test user',
    email: '',
  });
};

test.describe('User Profile Page', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await upsertTestUser(esClient);
  });

  test.beforeEach(async ({ pageObjects }) => {
    await pageObjects.login.loginWithUsernamePassword(TEST_USERNAME, TEST_PASSWORD);
    await pageObjects.userProfile.goto();
  });

  test.afterEach(async ({ uiSettings, esClient }) => {
    await uiSettings.unset('theme:darkMode');
    await upsertTestUser(esClient);
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username: TEST_USERNAME }, { ignore: [404] });
  });

  test('details: should set the full name', async ({ pageObjects }) => {
    const { userProfile, toasts } = pageObjects;

    await test.step('set full name', async () => {
      await userProfile.setFullName('Test User 2');
      await userProfile.saveChanges();
      await toasts.waitForToastWithText('Profile updated');
      await toasts.closeAll();
    });

    await test.step('reset full name', async () => {
      await userProfile.setFullName('test user');
      await userProfile.saveChanges();
      await toasts.waitForToastWithText('Profile updated');
      await toasts.closeAll();
    });
  });

  test('details: should set the email', async ({ pageObjects }) => {
    const { userProfile, toasts } = pageObjects;

    await test.step('set email', async () => {
      await userProfile.setEmail('test@test.com');
      await userProfile.saveChanges();
      await toasts.waitForToastWithText('Profile updated');
      await toasts.closeAll();
    });

    await test.step('clear email', async () => {
      await userProfile.clearEmail();
      await userProfile.saveChanges();
      await toasts.waitForToastWithText('Profile updated');
      await toasts.closeAll();
    });
  });

  test('change password: should set the current password and enter a new password, then submit', async ({
    pageObjects,
  }) => {
    const { userProfile, toasts } = pageObjects;

    await test.step('change to a new password', async () => {
      await userProfile.changePassword(TEST_PASSWORD, UPDATED_PASSWORD);
      await toasts.waitForToastWithText('Password successfully changed');
      await toasts.closeAll();
    });

    await test.step('change back using the new password', async () => {
      await userProfile.changePassword(UPDATED_PASSWORD, TEST_PASSWORD);
      await toasts.waitForToastWithText('Password successfully changed');
      await toasts.closeAll();
    });
  });

  test('theme: should change theme based on the User Profile Theme control with default Adv. Settings value (light)', async ({
    pageObjects,
  }) => {
    const { userProfile } = pageObjects;

    await expect(userProfile.themeKeypadMenu).toBeVisible();

    await test.step('change to dark', async () => {
      await userProfile.changeTheme('dark');
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealisdark');
    });

    await test.step('change to light', async () => {
      await userProfile.changeTheme('light');
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealislight');
    });

    await test.step('change to space default', async () => {
      await userProfile.changeTheme('space_default');
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealislight');
    });
  });

  test('theme: should change theme based on the User Profile Theme control with default Adv. Settings value set to dark', async ({
    uiSettings,
    pageObjects,
  }) => {
    const { userProfile } = pageObjects;

    await test.step('enable dark advanced setting', async () => {
      await uiSettings.set({ 'theme:darkMode': 'enabled' });
      await userProfile.goto();
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealisdark');
    });

    await test.step('change to light', async () => {
      await userProfile.changeTheme('light');
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealislight');
    });

    await test.step('change to dark', async () => {
      await userProfile.changeTheme('dark');
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealisdark');
    });

    await test.step('change to space default', async () => {
      await userProfile.changeTheme('space_default');
      await expect.poll(() => userProfile.getThemeTag()).toBe('borealisdark');
    });
  });
});
