/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const testUser = {
  username: 'newuser_email_test',
  password: 'changeme',
  full_name: 'newuserFirst newuserLast',
  email: 'newuser@myEmail.com',
  roles: ['kibana_admin', 'superuser'],
};

test.describe('User email and account settings', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username: testUser.username }).catch(() => {});
  });

  test('should add new user with email', async ({ pageObjects }) => {
    await pageObjects.securityUsers.createUser({
      username: testUser.username,
      password: testUser.password,
      confirm_password: testUser.password,
      full_name: testUser.full_name,
      email: testUser.email,
      roles: testUser.roles,
    });

    const users = await pageObjects.securityUsers.getAllUsers();
    const user = users.find((u) => u.username === testUser.username);
    expect(user).toBeDefined();
    expect(user!.roles).toContain('superuser');
    expect(user!.fullname).toBe(testUser.full_name);
    expect(user!.email).toBe(testUser.email);
    expect(user!.reserved).toBe(false);
  });

  test('login as new user and verify account settings', async ({ browserAuth, page }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {},
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });

    await page.gotoApp('security/account');
    await expect(page.testSubj.locator('username')).toHaveText(/.+/);
  });

  test('change password and re-login', async ({ pageObjects, browserAuth, esClient }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {},
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });

    await pageObjects.securityAccountSettings.goto();
    const usernameText = await pageObjects.securityAccountSettings.getUsernameText();
    expect(usernameText).toBeTruthy();

    await pageObjects.securityAccountSettings.openChangePasswordForm();
    await expect(pageObjects.securityAccountSettings.changePasswordFormSubmitButton).toBeVisible();
  });
});
