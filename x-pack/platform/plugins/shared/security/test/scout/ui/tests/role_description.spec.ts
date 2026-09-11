/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Role Description', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.security.deleteRole({ name: 'a-role-with-description' }).catch(() => {});
    await esClient.security.deleteRole({ name: 'a-role-without-description' }).catch(() => {});
  });

  test('Can create role with description', async ({ pageObjects, page }) => {
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.clickCreateNewRole();
    await pageObjects.securityRoles.roleFormNameInput.fill('a-role-with-description');
    await page.testSubj.locator('roleFormDescriptionInput').fill('role description');
    await pageObjects.securityRoles.saveRole();

    const columnDescription = page.testSubj.locator('roleRowDescription-a-role-with-description');
    await expect(columnDescription).toHaveText('role description');

    await pageObjects.securityRoles.clickEditRole('a-role-with-description');
    await expect(pageObjects.securityRoles.roleFormNameInput).toHaveValue(
      'a-role-with-description'
    );
    await expect(page.testSubj.locator('roleFormDescriptionInput')).toHaveValue('role description');
    await pageObjects.securityRoles.cancelRole();
  });

  test('Can create role without description', async ({ pageObjects, page }) => {
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.clickCreateNewRole();
    await pageObjects.securityRoles.roleFormNameInput.fill('a-role-without-description');
    await pageObjects.securityRoles.saveRole();

    await pageObjects.securityRoles.clickEditRole('a-role-without-description');
    await expect(pageObjects.securityRoles.roleFormNameInput).toHaveValue(
      'a-role-without-description'
    );
    await expect(page.testSubj.locator('roleFormDescriptionInput')).toHaveValue('');
    await pageObjects.securityRoles.cancelRole();
  });

  test.describe('accessibility', () => {
    test('roles main page has no accessibility violations', async ({ pageObjects, page }) => {
      await pageObjects.securityRoles.goto();
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    test('search roles has no accessibility violations', async ({ pageObjects, page }) => {
      await pageObjects.securityRoles.goto();
      await pageObjects.securityRoles.searchRolesInput.fill('apm_user');
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    test('show reserved roles toggle has no accessibility violations', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.securityRoles.goto();
      await pageObjects.securityRoles.showReservedRolesSwitch.waitFor({ state: 'visible' });
      await pageObjects.securityRoles.showReservedRolesSwitch.click();
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    test('create role form has no accessibility violations', async ({ pageObjects, page }) => {
      await pageObjects.securityRoles.goto();
      await pageObjects.securityRoles.clickCreateNewRole();
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
      await pageObjects.securityRoles.cancelRole();
    });

    test('select and delete role UI has no accessibility violations', async ({
      pageObjects,
      page,
      esClient,
    }) => {
      await esClient.security.putRole({
        name: 'a11y-test-role',
        body: { cluster: [], indices: [] },
      });

      try {
        await pageObjects.securityRoles.goto();
        await page.testSubj.locator('checkboxSelectRow-a11y-test-role').click();
        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);

        await pageObjects.securityRoles.deleteRoleButton.click();
        const { violations: deleteViolations } = await page.checkA11y({
          include: ['.kbnAppWrapper'],
        });
        expect(deleteViolations).toStrictEqual([]);
        await page.testSubj.locator('confirmModalCancelButton').click();
      } finally {
        await esClient.security.deleteRole({ name: 'a11y-test-role' }).catch(() => {});
      }
    });
  });
});
