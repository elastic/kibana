/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const TEST_USERNAME = 'scout_role_mappings_test_user';
const suffix = randomUUID();
const newMappingName = `new_role_mapping-${suffix}`;
const deleteMappingName = `delete_test_mapping-${suffix}`;
const clonedMappingName = `cloned_role_mapping-${suffix}`;

const mappings = [
  {
    name: `a_enabled_role_mapping-${suffix}`,
    enabled: true,
    roles: ['superuser'],
    rules: { field: { username: TEST_USERNAME } },
    metadata: {},
  },
  {
    name: `b_disabled_role_mapping-${suffix}`,
    enabled: false,
    role_templates: [{ template: { source: 'superuser' } }],
    rules: { field: { username: TEST_USERNAME } },
    metadata: {},
  },
];

const getMappingNames = async (kbnClient: KbnClient) => {
  const { data } = await kbnClient.request<Array<{ name: string }>>({
    method: 'GET',
    path: '/internal/security/role_mapping',
  });
  return (data ?? []).map(({ name }) => name);
};

test.describe('Role Mappings', { tag: tags.stateful.classic }, () => {
  let preExistingMappingNames: string[] = [];
  let ownedMappingNames: string[] = [];

  test.beforeEach(async ({ browserAuth, pageObjects, kbnClient }) => {
    ownedMappingNames = [];
    await browserAuth.loginAsAdmin();
    preExistingMappingNames = await getMappingNames(kbnClient);
    await pageObjects.securityRoleMappings.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    await Promise.all(
      ownedMappingNames.map((name) =>
        kbnClient.request({
          method: 'DELETE',
          path: `/internal/security/role_mapping/${name}`,
          ignoreErrors: [404],
        })
      )
    );
  });

  test('allows a role mapping to be created', async ({ pageObjects, kbnClient }) => {
    ownedMappingNames.push(newMappingName);
    await pageObjects.securityRoleMappings.createRoleMappingButton.click();
    await pageObjects.securityRoleMappings.fillRoleMappingName(newMappingName);
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

    expect(await getMappingNames(kbnClient)).toContain(newMappingName);
  });

  test('allows a role mapping to be deleted', async ({ pageObjects, kbnClient }) => {
    ownedMappingNames.push(deleteMappingName);
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${deleteMappingName}`,
      body: {
        enabled: true,
        roles: ['superuser'],
        role_templates: [],
        rules: { field: { username: TEST_USERNAME } },
        metadata: {},
      },
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.deleteRoleMapping(deleteMappingName);

    const remainingNames = await getMappingNames(kbnClient);
    expect(remainingNames).not.toContain(deleteMappingName);
    for (const name of preExistingMappingNames) {
      expect(remainingNames).toContain(name);
    }
  });

  test('displays an error when navigating to a non-existent role mapping', async ({ page }) => {
    await page.gotoApp(`management/security/role_mappings/edit/missing-${suffix}`);
    await expect(page.testSubj.locator('errorLoadingRoleMappingEditorToast')).toBeVisible();
    await expect(page).toHaveURL(/\/management\/security\/role_mappings\/?(?:\?.*)?$/);
  });

  test('displays a table of all role mappings', async ({ pageObjects, kbnClient }) => {
    ownedMappingNames.push(...mappings.map(({ name }) => name));
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
    for (const { name, enabled } of mappings) {
      expect(await pageObjects.securityRoleMappings.getRoleMapping(name)).toStrictEqual({
        name,
        enabled,
      });
    }
  });

  test('allows a role mapping to be cloned', async ({ pageObjects, kbnClient }) => {
    const { name, ...payload } = mappings[0];
    ownedMappingNames.push(name, clonedMappingName);
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${name}`,
      body: payload,
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.cloneRoleMapping(name);
    await pageObjects.securityRoleMappings.fillRoleMappingName(clonedMappingName);
    await pageObjects.securityRoleMappings.saveRoleMapping();

    await expect(await pageObjects.securityRoleMappings.findRoleMappingRow(name)).toBeVisible();
    await expect(
      await pageObjects.securityRoleMappings.findRoleMappingRow(clonedMappingName)
    ).toBeVisible();
  });

  test('allows a role mapping to be edited', async ({ pageObjects, kbnClient }) => {
    const { name, ...payload } = mappings[0];
    ownedMappingNames.push(name);
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${name}`,
      body: payload,
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.editRoleMapping(name);
    await pageObjects.securityRoleMappings.saveRoleMapping();

    await expect(await pageObjects.securityRoleMappings.findRoleMappingRow(name)).toBeVisible();
  });
});
