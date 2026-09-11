/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { test } from '../fixtures';

const roleName = 'data-source-privs-crud-role';
const updatedRoleDescription = 'updated role description';

const expectedDataSourcePrivileges = [
  {
    names: ['acme_*'],
    privileges: ['read'],
  },
];

test.describe('Roles CRUD with data source privileges', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.security.deleteRole({ name: roleName }).catch(() => {});

    await esClient.security.putRole({
      name: roleName,
      body: {
        cluster: [],
        indices: [],
        run_as: [],
        global: {
          // @ts-ignore — data_source is a valid global privilege
          data_source: expectedDataSourcePrivileges,
        },
        kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
      },
    });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteRole({ name: roleName }).catch(() => {});
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test('can read the role from the roles listing', async ({ pageObjects }) => {
    await pageObjects.securityRoles.goto();
    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === roleName)).toBe(true);
  });

  test('can update a role and preserves its data source privileges', async ({
    pageObjects,
    page,
    esClient,
  }) => {
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.clickEditRole(roleName);

    await expect(pageObjects.securityRoles.roleFormNameInput).toHaveValue(roleName);
    await page.testSubj.locator('roleFormDescriptionInput').fill(updatedRoleDescription);
    await pageObjects.securityRoles.saveRole();

    const columnDescription = await page.testSubj
      .locator(`roleRowDescription-${roleName}`)
      .innerText();
    expect(columnDescription).toBe(updatedRoleDescription);

    const updatedRole = await esClient.security.getRole({ name: roleName });
    expect(updatedRole[roleName]?.global?.data_source).toEqual(expectedDataSourcePrivileges);
  });

  test('can delete a role with data source privileges', async ({ pageObjects, page }) => {
    await pageObjects.securityRoles.goto();
    await page.testSubj.locator(`checkboxSelectRow-${roleName}`).click();
    await pageObjects.securityRoles.deleteRoleButton.click();
    await page.testSubj.locator('confirmModalConfirmButton').click();
    await page.testSubj.locator('confirmModalConfirmButton').waitFor({ state: 'hidden' });

    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === roleName)).toBe(false);
  });
});
