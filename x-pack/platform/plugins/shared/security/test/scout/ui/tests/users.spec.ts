/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Security - Users management', { tag: tags.stateful.classic }, () => {
  const optionalUser = {
    username: `OptionalUser-${randomUUID()}`,
    password: 'OptionalUserPwd',
    confirm_password: 'OptionalUserPwd',
    roles: ['superuser'],
  };

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
    });
    await pageObjects.securityUsers.goto();
  });

  test('should show the default elastic and kibana_system users', async ({
    pageObjects,
    config,
  }) => {
    const builtInUsers = [
      { username: 'elastic', roles: ['superuser'], reserved: true, deprecated: false },
      { username: 'kibana_system', roles: ['kibana_system'], reserved: true, deprecated: false },
      { username: 'kibana', roles: ['kibana_system'], reserved: true, deprecated: true },
    ];
    for (const user of builtInUsers) {
      const actual = config.isCloud
        ? await pageObjects.securityUsers.expectUserAbsent(user.username)
        : await pageObjects.securityUsers.getUser(user.username);
      const expected = config.isCloud ? undefined : expect.objectContaining(user);
      expect(actual).toStrictEqual(expected);
    }
  });

  test('should add new user', async ({ pageObjects, esClient }) => {
    const username = `Lee-${randomUUID()}`;
    try {
      await pageObjects.securityUsers.createUser({
        username,
        password: 'LeePwd',
        confirm_password: 'LeePwd',
        full_name: 'LeeFirst LeeLast',
        email: 'lee@myEmail.com',
        roles: ['kibana_admin'],
      });
      const user = await pageObjects.securityUsers.getUser(username);
      expect(user.roles).toStrictEqual(['kibana_admin']);
      expect(user.fullname).toBe('LeeFirst LeeLast');
      expect(user.email).toBe('lee@myEmail.com');
      expect(user.reserved).toBe(false);
    } finally {
      await esClient.security.deleteUser({ username }, { ignore: [404] });
    }
  });

  test('should add new user with optional fields left empty', async ({ pageObjects, esClient }) => {
    try {
      await pageObjects.securityUsers.createUser(optionalUser);
      const user = await pageObjects.securityUsers.getUser(optionalUser.username);
      expect(user.roles).toStrictEqual(optionalUser.roles);
      expect(user.fullname).toBe('');
      expect(user.email).toBe('');
      expect(user.reserved).toBe(false);
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('should delete user', async ({ pageObjects, esClient }) => {
    const username = `DeleteMe-${randomUUID()}`;
    try {
      await esClient.security.putUser({
        username,
        password: 'DeleteMePwd',
        roles: ['kibana_admin'],
      });
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.deleteUser(username);
      await pageObjects.securityUsers.expectUserAbsent(username);
    } finally {
      await esClient.security.deleteUser({ username }, { ignore: [404] });
    }
  });

  test('should show the default roles', async ({ pageObjects }) => {
    for (const name of [
      'apm_system',
      'beats_admin',
      'beats_system',
      'kibana_admin',
      'kibana_system',
      'logstash_system',
      'monitoring_user',
    ]) {
      const role = await pageObjects.securityRoles.getRole(name);
      expect(role.reserved).toBe(true);
      expect(role.deprecated).toBe(false);
    }
    const deprecatedRole = await pageObjects.securityRoles.getRole('kibana_user');
    expect(deprecatedRole.reserved).toBe(true);
    expect(deprecatedRole.deprecated).toBe(true);
  });

  test('update user profile when submitting form and redirects back', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    try {
      await esClient.security.putUser({
        username: optionalUser.username,
        password: optionalUser.password,
        roles: optionalUser.roles,
      });
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.updateUserProfile({
        username: optionalUser.username,
        full_name: 'Optional User',
        email: 'optionalUser@elastic.co',
      });

      await expect(page).toHaveURL(/\/management\/security\/users\/?(?:\?.*)?$/);

      const user = await pageObjects.securityUsers.getUser(optionalUser.username);
      expect(user.fullname).toBe('Optional User');
      expect(user.email).toBe('optionalUser@elastic.co');
      expect(user.roles).toStrictEqual(optionalUser.roles);
      expect(user.reserved).toBe(false);
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('change password of other user when submitting form', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    try {
      await esClient.security.putUser({
        username: optionalUser.username,
        password: optionalUser.password,
        roles: optionalUser.roles,
      });
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.updateUserPassword({
        username: optionalUser.username,
        password: 'NewOptionalUserPwd',
        confirm_password: 'NewOptionalUserPwd',
      });
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        'Password successfully changed'
      );
      await page.context().clearCookies();
      await pageObjects.login.loginWithUsernamePassword(
        optionalUser.username,
        'NewOptionalUserPwd'
      );
      await expect(page.testSubj.locator('userMenuAvatar')).toBeVisible();
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('change password of current user when submitting form', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    try {
      await esClient.security.putUser({
        username: optionalUser.username,
        password: optionalUser.password,
        roles: optionalUser.roles,
      });
      await page.context().clearCookies();
      await pageObjects.login.loginWithUsernamePassword(
        optionalUser.username,
        optionalUser.password
      );
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.updateUserPassword(
        {
          username: optionalUser.username,
          current_password: optionalUser.password,
          password: 'NewOptionalUserPwd',
          confirm_password: 'NewOptionalUserPwd',
        },
        true
      );
      await pageObjects.toasts.waitForToastWithText('Password successfully changed');
      await page.context().clearCookies();
      await pageObjects.login.loginWithUsernamePassword(
        optionalUser.username,
        'NewOptionalUserPwd'
      );
      await expect(page.testSubj.locator('userMenuAvatar')).toBeVisible();
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('deactivates user when confirming', async ({ pageObjects, esClient }) => {
    try {
      await esClient.security.putUser({
        username: optionalUser.username,
        password: optionalUser.password,
        roles: optionalUser.roles,
      });
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.deactivateUser(optionalUser.username);

      const user = await pageObjects.securityUsers.getUser(optionalUser.username);
      expect(user.enabled).toBe(false);
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('activates user when confirming', async ({ pageObjects, esClient }) => {
    try {
      await esClient.security.putUser({
        username: optionalUser.username,
        password: optionalUser.password,
        roles: optionalUser.roles,
      });
      await esClient.security.disableUser({ username: optionalUser.username });

      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.activateUser(optionalUser.username);

      const user = await pageObjects.securityUsers.getUser(optionalUser.username);
      expect(user.enabled).toBe(true);
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('delete user when confirming closes dialog and redirects', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    try {
      await esClient.security.putUser({
        username: optionalUser.username,
        password: optionalUser.password,
        roles: optionalUser.roles,
      });
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.deleteUser(optionalUser.username);

      await expect(page).toHaveURL(/management\/security\/users/);
      await pageObjects.securityUsers.expectUserAbsent(optionalUser.username);
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }, { ignore: [404] });
    }
  });

  test('users page has no accessibility violations', async ({ pageObjects, page }) => {
    await pageObjects.securityUsers.goto();
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('search users has no accessibility violations', async ({ pageObjects, page }) => {
    await pageObjects.securityUsers.goto();
    await pageObjects.securityUsers.searchUsersInput.click();
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('show reserved users toggle has no accessibility violations', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.securityUsers.goto();
    await pageObjects.securityUsers.showReservedUsersSwitch.waitFor({ state: 'visible' });
    await pageObjects.securityUsers.showReservedUsersSwitch.click();
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('create user panel has no accessibility violations', async ({ pageObjects, page }) => {
    await pageObjects.securityUsers.goto();
    await pageObjects.securityUsers.clickCreateNewUser();
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('delete user panel has no accessibility violations', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    const username = `a11yDeleteUser-${randomUUID()}`;
    try {
      await esClient.security.putUser({ username, password: 'password', roles: ['editor'] });
      await pageObjects.securityUsers.goto();
      const row = await pageObjects.securityUsers.findUserRow(username);
      await row.locator(`[data-test-subj="checkboxSelectRow-${username}"]`).click();
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);

      await pageObjects.securityUsers.deleteUserButton.click();
      const { violations: deleteViolations } = await page.checkA11y({
        include: ['.kbnAppWrapper'],
      });
      expect(deleteViolations).toStrictEqual([]);
      await page.testSubj.locator('confirmModalCancelButton').click();
    } finally {
      await esClient.security.deleteUser({ username }, { ignore: [404] });
    }
  });

  test('edit user panel has no accessibility violations', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    const username = `a11yEditUser-${randomUUID()}`;
    try {
      await esClient.security.putUser({ username, password: 'password', roles: ['editor'] });
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.clickUserByName(username);
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    } finally {
      await esClient.security.deleteUser({ username }, { ignore: [404] });
    }
  });
});
