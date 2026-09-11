/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Security - Users management', { tag: tags.stateful.classic }, () => {
  const optionalUser = {
    username: 'OptionalUser',
    password: 'OptionalUserPwd',
    confirm_password: 'OptionalUserPwd',
    roles: ['superuser'],
  };

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityUsers.goto();
  });

  test('should show the default elastic and kibana_system users', async ({ pageObjects }) => {
    const users = await pageObjects.securityUsers.getAllUsers();
    const byUsername = Object.fromEntries(users.map((u) => [u.username, u]));

    expect(byUsername.elastic.roles).toContain('superuser');
    expect(byUsername.elastic.reserved).toBe(true);
    expect(byUsername.elastic.deprecated).toBe(false);

    expect(byUsername.kibana_system.roles).toContain('kibana_system');
    expect(byUsername.kibana_system.reserved).toBe(true);
    expect(byUsername.kibana_system.deprecated).toBe(false);
  });

  test('should add new user', async ({ pageObjects, esClient }) => {
    await pageObjects.securityUsers.createUser({
      username: 'Lee',
      password: 'LeePwd',
      confirm_password: 'LeePwd',
      full_name: 'LeeFirst LeeLast',
      email: 'lee@myEmail.com',
      roles: ['kibana_admin'],
    });

    try {
      const users = await pageObjects.securityUsers.getAllUsers();
      const lee = users.find((u) => u.username === 'Lee');
      expect(lee).toBeDefined();
      expect(lee!.roles).toContain('kibana_admin');
      expect(lee!.fullname).toBe('LeeFirst LeeLast');
      expect(lee!.email).toBe('lee@myEmail.com');
      expect(lee!.reserved).toBe(false);
    } finally {
      await esClient.security.deleteUser({ username: 'Lee' }).catch(() => {});
    }
  });

  test('should add new user with optional fields left empty', async ({ pageObjects, esClient }) => {
    await pageObjects.securityUsers.createUser(optionalUser);

    try {
      const users = await pageObjects.securityUsers.getAllUsers();
      const user = users.find((u) => u.username === optionalUser.username);
      expect(user).toBeDefined();
      expect(user!.roles).toContain('superuser');
      expect(user!.fullname).toBe('');
      expect(user!.email).toBe('');
      expect(user!.reserved).toBe(false);
    } finally {
      await esClient.security.deleteUser({ username: optionalUser.username }).catch(() => {});
    }
  });

  test('should delete user', async ({ pageObjects, esClient }) => {
    await esClient.security.putUser({
      username: 'DeleteMe',
      body: { password: 'DeleteMePwd', roles: ['kibana_admin'] },
    });

    await pageObjects.securityUsers.goto();
    await pageObjects.securityUsers.deleteUser('DeleteMe');

    const users = await pageObjects.securityUsers.getAllUsers();
    expect(users.find((u) => u.username === 'DeleteMe')).toBeUndefined();
  });

  test('should show the default roles', async ({ pageObjects }) => {
    await pageObjects.securityRoles.goto();
    const roles = await pageObjects.securityRoles.getAllRoles();
    const byName = Object.fromEntries(roles.map((r) => [r.rolename, r]));

    expect(byName.apm_system?.reserved).toBe(true);
    expect(byName.beats_admin?.reserved).toBe(true);
    expect(byName.beats_system?.reserved).toBe(true);
    expect(byName.kibana_admin?.reserved).toBe(true);
    expect(byName.kibana_system?.reserved).toBe(true);
    expect(byName.logstash_system?.reserved).toBe(true);
    expect(byName.monitoring_user?.reserved).toBe(true);
    expect(byName.kibana_user?.deprecated).toBe(true);
  });

  test.describe('edit user', () => {
    test.beforeEach(async ({ esClient }) => {
      await esClient.security.putUser({
        username: optionalUser.username,
        body: { password: optionalUser.password, roles: optionalUser.roles },
      });
    });

    test.afterEach(async ({ esClient }) => {
      await esClient.security.deleteUser({ username: optionalUser.username }).catch(() => {});
    });

    test('update user profile when submitting form and redirects back', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.updateUserProfile({
        username: optionalUser.username,
        full_name: 'Optional User',
        email: 'optionalUser@elastic.co',
      });

      await expect(page).toHaveURL(/management\/security\/users/);

      const users = await pageObjects.securityUsers.getAllUsers();
      const user = users.find((u) => u.username === optionalUser.username);
      expect(user!.fullname).toBe('Optional User');
      expect(user!.email).toBe('optionalUser@elastic.co');
    });

    test('change password of other user when submitting form', async ({ pageObjects, page }) => {
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.updateUserPassword({
        username: optionalUser.username,
        password: 'NewOptionalUserPwd',
        confirm_password: 'NewOptionalUserPwd',
      });
      await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
        'Password successfully changed'
      );
    });

    test('deactivates user when confirming', async ({ pageObjects }) => {
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.deactivateUser(optionalUser.username);

      const users = await pageObjects.securityUsers.getAllUsers();
      const user = users.find((u) => u.username === optionalUser.username);
      expect(user!.enabled).toBe(false);
    });

    test('activates user when confirming', async ({ pageObjects, esClient }) => {
      await esClient.security.disableUser({ username: optionalUser.username });

      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.activateUser(optionalUser.username);

      const users = await pageObjects.securityUsers.getAllUsers();
      const user = users.find((u) => u.username === optionalUser.username);
      expect(user!.enabled).toBe(true);
    });

    test('delete user when confirming closes dialog and redirects', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.securityUsers.goto();
      await pageObjects.securityUsers.deleteUser(optionalUser.username);

      await expect(page).toHaveURL(/management\/security\/users/);

      const users = await pageObjects.securityUsers.getAllUsers();
      expect(users.find((u) => u.username === optionalUser.username)).toBeUndefined();
    });
  });

  test.describe('accessibility', () => {
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
      await esClient.security.putUser({
        username: 'a11yDeleteUser',
        body: { password: 'password', roles: ['editor'] },
      });

      try {
        await pageObjects.securityUsers.goto();
        await page.testSubj.locator('checkboxSelectRow-a11yDeleteUser').click();
        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);

        await pageObjects.securityUsers.deleteUserButton.click();
        const { violations: deleteViolations } = await page.checkA11y({
          include: ['.kbnAppWrapper'],
        });
        expect(deleteViolations).toStrictEqual([]);
        await page.testSubj.locator('confirmModalCancelButton').click();
      } finally {
        await esClient.security.deleteUser({ username: 'a11yDeleteUser' }).catch(() => {});
      }
    });

    test('edit user panel has no accessibility violations', async ({
      pageObjects,
      page,
      esClient,
    }) => {
      await esClient.security.putUser({
        username: 'a11yEditUser',
        body: { password: 'password', roles: ['editor'] },
      });

      try {
        await pageObjects.securityUsers.goto();
        await pageObjects.securityUsers.clickUserByName('a11yEditUser');
        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);
      } finally {
        await esClient.security.deleteUser({ username: 'a11yEditUser' }).catch(() => {});
      }
    });
  });
});
