/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const USERS_PATH = 'management/security/users';
const CREATE_USERS_PATH = `${USERS_PATH}/create`;
const EDIT_USERS_PATH = `${USERS_PATH}/edit`;
const ROLES_PATH = 'management/security/roles';
const EDIT_ROLES_PATH = `${ROLES_PATH}/edit`;
const CLONE_ROLES_PATH = `${ROLES_PATH}/clone`;

test.describe('Security - Management navigation', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test.describe('Security navigation', () => {
    test.describe('navigation', () => {
      test('Can navigate to create user section', async ({ pageObjects, page }) => {
        await pageObjects.securityUsers.goto();
        await pageObjects.securityUsers.clickCreateNewUser();
        await expect(page).toHaveURL(new RegExp(CREATE_USERS_PATH));
      });

      test('Clicking cancel in create user section brings user back to listing', async ({
        pageObjects,
        page,
      }) => {
        await pageObjects.securityUsers.goto();
        await pageObjects.securityUsers.clickCreateNewUser();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page).toHaveURL(new RegExp(USERS_PATH));
        await expect(page).not.toHaveURL(new RegExp(CREATE_USERS_PATH));
      });

      test('Clicking save in create user section brings user back to listing', async ({
        pageObjects,
        page,
        esClient,
      }) => {
        await pageObjects.securityUsers.goto();
        await pageObjects.securityUsers.clickCreateNewUser();
        await pageObjects.securityUsers.fillUserForm({
          username: 'new-user-mgmt',
          password: '123456',
          confirm_password: '123456',
          full_name: 'Full User Name',
          email: 'example@example.com',
        });
        await pageObjects.securityUsers.submitCreateUser();

        try {
          await expect(page).toHaveURL(new RegExp(USERS_PATH));
          await expect(page).not.toHaveURL(new RegExp(CREATE_USERS_PATH));
        } finally {
          await esClient.security.deleteUser({ username: 'new-user-mgmt' }).catch(() => {});
        }
      });

      test('Can navigate to edit user section', async ({ pageObjects, page, esClient }) => {
        await esClient.security.putUser({
          username: 'nav-test-user',
          body: { password: '123456', roles: ['kibana_admin'] },
        });

        try {
          await pageObjects.securityUsers.goto();
          await pageObjects.securityUsers.clickUserByName('nav-test-user');
          await expect(page).toHaveURL(new RegExp(EDIT_USERS_PATH));
          await expect(page.testSubj.locator('userFormUserNameInput')).toHaveValue('nav-test-user');
        } finally {
          await esClient.security.deleteUser({ username: 'nav-test-user' }).catch(() => {});
        }
      });

      test('Can navigate to roles section', async ({ pageObjects, page }) => {
        await pageObjects.securityRoles.goto();
        await expect(page).toHaveURL(new RegExp(ROLES_PATH));
      });

      test('Can navigate to create role section', async ({ pageObjects, page }) => {
        await pageObjects.securityRoles.goto();
        await pageObjects.securityRoles.clickCreateNewRole();
        await expect(page).toHaveURL(new RegExp(EDIT_ROLES_PATH));
      });

      test('Clicking cancel in create role section brings user back to listing', async ({
        pageObjects,
        page,
      }) => {
        await pageObjects.securityRoles.goto();
        await pageObjects.securityRoles.clickCreateNewRole();
        await pageObjects.securityRoles.cancelRole();
        await expect(page).toHaveURL(new RegExp(ROLES_PATH));
        await expect(page).not.toHaveURL(new RegExp(EDIT_ROLES_PATH));
      });

      test('Clicking save in create role section brings user back to listing', async ({
        pageObjects,
        page,
        esClient,
      }) => {
        await pageObjects.securityRoles.goto();
        await pageObjects.securityRoles.clickCreateNewRole();
        await pageObjects.securityRoles.roleFormNameInput.fill('a-my-new-role-mgmt');
        await pageObjects.securityRoles.saveRole();

        try {
          await expect(page).toHaveURL(new RegExp(ROLES_PATH));
          await expect(page).not.toHaveURL(new RegExp(EDIT_ROLES_PATH));
        } finally {
          await esClient.security.deleteRole({ name: 'a-my-new-role-mgmt' }).catch(() => {});
        }
      });

      test('Can navigate to edit role section', async ({ pageObjects, page, esClient }) => {
        await esClient.security.putRole({
          name: 'nav-test-role',
          body: { cluster: [], indices: [], kibana: [{ base: ['all'], spaces: ['*'] }] },
        });

        try {
          await pageObjects.securityRoles.goto();
          await pageObjects.securityRoles.clickEditRole('nav-test-role');
          await expect(page).toHaveURL(new RegExp(EDIT_ROLES_PATH));
          await expect(pageObjects.securityRoles.roleFormNameInput).toHaveValue('nav-test-role');
        } finally {
          await esClient.security.deleteRole({ name: 'nav-test-role' }).catch(() => {});
        }
      });

      test('Can navigate to clone role section', async ({ pageObjects, page, esClient }) => {
        await esClient.security.putRole({
          name: 'clone-source-role',
          body: { cluster: [], indices: [], kibana: [{ base: ['all'], spaces: ['*'] }] },
        });

        try {
          await pageObjects.securityRoles.goto();
          await pageObjects.securityRoles.clickCloneRole('clone-source-role');
          await expect(page).toHaveURL(new RegExp(CLONE_ROLES_PATH));
        } finally {
          await esClient.security.deleteRole({ name: 'clone-source-role' }).catch(() => {});
        }
      });

      test('Can navigate to edit role section from users page', async ({
        pageObjects,
        page,
        esClient,
      }) => {
        await esClient.security.putRole({
          name: 'link-test-role',
          body: { cluster: [], indices: [], kibana: [{ base: ['all'], spaces: ['*'] }] },
        });
        await esClient.security.putUser({
          username: 'link-test-dashuser',
          body: { password: '123456', roles: ['link-test-role'] },
        });

        try {
          await pageObjects.securityUsers.goto();
          await pageObjects.securityUsers.clickUserByName('link-test-dashuser');
          await page.getByRole('link', { name: 'link-test-role' }).click();
          await expect(page).toHaveURL(new RegExp(EDIT_ROLES_PATH));
        } finally {
          await esClient.security.deleteUser({ username: 'link-test-dashuser' }).catch(() => {});
          await esClient.security.deleteRole({ name: 'link-test-role' }).catch(() => {});
        }
      });
    });
  });
});
