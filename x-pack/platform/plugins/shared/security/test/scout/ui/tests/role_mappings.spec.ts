/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const TEST_USERNAME = 'scout_role_mappings_test_user';

const mappings = [
  {
    name: 'a_enabled_role_mapping',
    enabled: true,
    roles: ['superuser'],
    rules: { field: { username: TEST_USERNAME } },
    metadata: {},
  },
  {
    name: 'b_disabled_role_mapping',
    enabled: false,
    role_templates: [{ template: { source: 'superuser' } }],
    rules: { field: { username: TEST_USERNAME } },
    metadata: {},
  },
];

const ownedMappingNames = [
  ...mappings.map(({ name }) => name),
  'delete_test_mapping',
  'new_role_mapping',
  'cloned_role_mapping',
];

const deleteOwnedMappings = async (kbnClient: KbnClient) => {
  await Promise.all(
    ownedMappingNames.map((name) =>
      kbnClient.request({
        method: 'DELETE',
        path: `/internal/security/role_mapping/${name}`,
        ignoreErrors: [404],
      })
    )
  );
};

const getMappingNames = async (kbnClient: KbnClient) => {
  const { data } = await kbnClient.request<Array<{ name: string }>>({
    method: 'GET',
    path: '/internal/security/role_mapping',
  });
  return (data ?? []).map(({ name }) => name);
};

test.describe('Role Mappings', { tag: tags.stateful.classic }, () => {
  let preExistingMappingNames: string[] = [];

  test.beforeEach(async ({ browserAuth, pageObjects, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    preExistingMappingNames = (await getMappingNames(kbnClient)).filter(
      (name) => !ownedMappingNames.includes(name)
    );
    await deleteOwnedMappings(kbnClient);
    await pageObjects.securityRoleMappings.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    await deleteOwnedMappings(kbnClient);
  });

  test('displays a message when no role mappings exist', async ({ page, pageObjects }) => {
    await page.route('**/internal/security/role_mapping', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await pageObjects.securityRoleMappings.goto();

    await expect(pageObjects.securityRoleMappings.emptyPrompt).toBeVisible();
    await expect(pageObjects.securityRoleMappings.createRoleMappingButton).toBeVisible();
  });

  test('allows a role mapping to be created', async ({ pageObjects, kbnClient }) => {
    await pageObjects.securityRoleMappings.createRoleMappingButton.click();
    await pageObjects.securityRoleMappings.fillRoleMappingName('new_role_mapping');
    await pageObjects.securityRoleMappings.selectRole('superuser');
    await pageObjects.securityRoleMappings.addRule();
    await pageObjects.securityRoleMappings.switchToJsonRuleEditor();

    await pageObjects.securityRoleMappings.setJsonRuleEditorValue(
      JSON.stringify({
        all: [
          { field: { username: TEST_USERNAME } },
          { field: { 'metadata.foo.bar': 'baz' } },
          {
            except: {
              any: [{ field: { dn: 'foo' } }, { field: { dn: 'bar' } }],
            },
          },
        ],
      })
    );

    await pageObjects.securityRoleMappings.switchToVisualRuleEditor();
    await pageObjects.securityRoleMappings.saveRoleMapping();

    expect(await getMappingNames(kbnClient)).toContain('new_role_mapping');
  });

  test('allows a role mapping to be deleted', async ({ pageObjects, kbnClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/security/role_mapping/delete_test_mapping',
      body: {
        enabled: true,
        roles: ['superuser'],
        role_templates: [],
        rules: { field: { username: TEST_USERNAME } },
        metadata: {},
      },
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.deleteRoleMapping('delete_test_mapping');

    const remainingNames = await getMappingNames(kbnClient);
    expect(remainingNames).not.toContain('delete_test_mapping');
    for (const name of preExistingMappingNames) {
      expect(remainingNames).toContain(name);
    }
  });

  test('displays an error when navigating to a non-existent role mapping', async ({ page }) => {
    await page.gotoApp('management/security/role_mappings/edit/i-do-not-exist');
    await expect(page.testSubj.locator('errorLoadingRoleMappingEditorToast')).toBeVisible();
    await expect(page).toHaveURL(/\/management\/security\/role_mappings\/?(?:\?.*)?$/);
  });

  test('displays a table of all role mappings', async ({ pageObjects, kbnClient }) => {
    await Promise.all(
      mappings.map(({ name, ...payload }) =>
        kbnClient.request({
          method: 'POST',
          path: `/internal/security/role_mapping/${name}`,
          body: payload,
        })
      )
    );

    await pageObjects.securityRoleMappings.goto();
    const rows = await pageObjects.securityRoleMappings.getAllRoleMappings();

    for (const { name, enabled } of mappings) {
      expect(rows).toContainEqual({ name, enabled });
    }
  });

  test('allows a role mapping to be cloned', async ({ pageObjects, kbnClient }) => {
    const { name, ...payload } = mappings[0];
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${name}`,
      body: payload,
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.cloneRoleMapping(name);
    await pageObjects.securityRoleMappings.fillRoleMappingName('cloned_role_mapping');
    await pageObjects.securityRoleMappings.saveRoleMapping();

    await expect(pageObjects.securityRoleMappings.getRoleMappingRow(name)).toBeVisible();
    await expect(
      pageObjects.securityRoleMappings.getRoleMappingRow('cloned_role_mapping')
    ).toBeVisible();
  });

  test('allows a role mapping to be edited', async ({ pageObjects, kbnClient }) => {
    const { name, ...payload } = mappings[0];
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${name}`,
      body: payload,
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.editRoleMapping(name);
    await pageObjects.securityRoleMappings.saveRoleMapping();

    await expect(pageObjects.securityRoleMappings.getRoleMappingRow(name)).toBeVisible();
  });
});
