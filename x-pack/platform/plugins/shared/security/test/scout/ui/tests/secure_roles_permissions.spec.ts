/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const roleName = 'logstash_reader_perm_test';
const username = 'Rashmi';

test.describe('Secure roles and permissions', { tag: tags.stateful.classic }, () => {
  let defaultIndex: string | undefined;

  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    const previousDefaultIndex = await kbnClient.uiSettings.getDefaultIndex();
    defaultIndex = typeof previousDefaultIndex === 'string' ? previousDefaultIndex : undefined;
    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/logstash_functional');
    await kbnClient.importExport.load(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/discover'
    );
    await kbnClient.uiSettings.update({ defaultIndex: 'logstash-*' });
  });

  test.afterAll(async ({ kbnClient, esClient }) => {
    if (defaultIndex === undefined) {
      await kbnClient.uiSettings.unset('defaultIndex');
    } else {
      await kbnClient.uiSettings.update({ defaultIndex });
    }
    await kbnClient.importExport.unload(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/discover'
    );
    await esClient.security.deleteUser({ username });
    await esClient.security.deleteRole({ name: roleName });
  });

  test('UI-created user can export a saved search but cannot manage users', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole(roleName, {
      elasticsearch: {
        indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
      },
    });
    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((role) => role.rolename === roleName)).toBe(true);

    await pageObjects.securityUsers.createUser({
      username,
      password: 'changeme',
      confirm_password: 'changeme',
      full_name: 'RashmiFirst RashmiLast',
      email: 'rashmi@myEmail.com',
      roles: [roleName],
    });
    const users = await pageObjects.securityUsers.getAllUsers();
    const user = users.find((entry) => entry.username === username);
    expect(user?.roles).toStrictEqual([roleName]);
    expect(user?.fullname).toBe('RashmiFirst RashmiLast');
    expect(user?.reserved).toBe(false);

    await page.context().clearCookies();
    await pageObjects.login.loginWithUsernamePassword(username, 'changeme');
    await page.gotoApp('management');
    await expect(
      page.testSubj
        .locator('managementHome')
        .or(page.testSubj.locator('managementHomeSolution'))
        .or(page.testSubj.locator('cards-navigation-page'))
    ).toBeVisible();
    await expect(page.testSubj.locator('users')).toBeHidden();

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.loadSavedSearch('A Saved Search');
    await pageObjects.discover.clickAppMenuItem('exportTopNavButton');
    await expect(page.testSubj.locator('exportPopoverPanel')).toBeVisible();
  });
});
