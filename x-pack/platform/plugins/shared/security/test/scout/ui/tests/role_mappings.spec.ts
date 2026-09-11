/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const mappings = [
  {
    name: 'a_enabled_role_mapping',
    enabled: true,
    roles: ['superuser'],
    rules: { field: { username: '*' } },
    metadata: {},
  },
  {
    name: 'b_disabled_role_mapping',
    enabled: false,
    role_templates: [{ template: { source: 'superuser' } }],
    rules: { field: { username: '*' } },
    metadata: {},
  },
];

test.describe('Role Mappings', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    const existingMappings = await kbnClient.request<Array<{ name: string }>>({
      method: 'GET',
      path: '/internal/security/role_mapping',
    });
    if (existingMappings.data) {
      await Promise.all(
        existingMappings.data.map((m) =>
          kbnClient
            .request({ method: 'DELETE', path: `/internal/security/role_mapping/${m.name}` })
            .catch(() => {})
        )
      );
    }
    await pageObjects.securityRoleMappings.goto();
  });

  test('displays a message when no role mappings exist', async ({ pageObjects }) => {
    await expect(pageObjects.securityRoleMappings.emptyPrompt).toBeVisible();
    await expect(pageObjects.securityRoleMappings.createRoleMappingButton).toBeVisible();
  });

  test('allows a role mapping to be created', async ({ pageObjects }) => {
    await pageObjects.securityRoleMappings.createRoleMappingButton.click();
    await pageObjects.securityRoleMappings.fillRoleMappingName('new_role_mapping');
    await pageObjects.securityRoleMappings.selectRole('superuser');
    await pageObjects.securityRoleMappings.addRule();
    await pageObjects.securityRoleMappings.switchToJsonRuleEditor();

    await pageObjects.securityRoleMappings.setJsonRuleEditorValue(
      JSON.stringify({
        all: [
          { field: { username: '*' } },
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
  });

  test('allows a role mapping to be deleted', async ({ pageObjects, kbnClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/security/role_mapping/delete_test_mapping',
      body: {
        enabled: true,
        roles: ['superuser'],
        role_templates: [],
        rules: { field: { username: '*' } },
        metadata: {},
      },
    });

    await pageObjects.securityRoleMappings.goto();
    await pageObjects.securityRoleMappings.deleteRoleMapping('delete_test_mapping');
  });

  test('displays an error when navigating to a non-existent role mapping', async ({
    pageObjects,
    page,
  }) => {
    await page.goto('/app/management/security/role_mappings/edit/i-do-not-exist');
    await expect(page.testSubj.locator('errorLoadingRoleMappingEditorToast')).toBeVisible();
    await expect(page).toHaveURL(/management\/security\/role_mappings\//);
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

    try {
      await pageObjects.securityRoleMappings.goto();
      const rows = await pageObjects.securityRoleMappings.getAllRoleMappings();
      expect(rows).toHaveLength(mappings.length);
      for (let i = 0; i < rows.length; i++) {
        expect(rows[i].name).toBe(mappings[i].name);
        expect(rows[i].enabled).toBe(mappings[i].enabled);
      }
    } finally {
      await Promise.all(
        mappings.map(({ name }) =>
          kbnClient
            .request({ method: 'DELETE', path: `/internal/security/role_mapping/${name}` })
            .catch(() => {})
        )
      );
    }
  });

  test('allows a role mapping to be cloned', async ({ pageObjects, kbnClient }) => {
    const { name, ...payload } = mappings[0];
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${name}`,
      body: payload,
    });

    try {
      await pageObjects.securityRoleMappings.goto();
      await pageObjects.securityRoleMappings.cloneRoleMapping(name);
      await pageObjects.securityRoleMappings.fillRoleMappingName('cloned_role_mapping');
      await pageObjects.securityRoleMappings.saveRoleMapping();

      const rows = await pageObjects.securityRoleMappings.getAllRoleMappings();
      expect(rows).toHaveLength(2);
    } finally {
      await kbnClient
        .request({
          method: 'DELETE',
          path: '/internal/security/role_mapping/cloned_role_mapping',
        })
        .catch(() => {});
      await kbnClient
        .request({ method: 'DELETE', path: `/internal/security/role_mapping/${name}` })
        .catch(() => {});
    }
  });

  test('allows a role mapping to be edited', async ({ pageObjects, page, kbnClient }) => {
    const { name, ...payload } = mappings[0];
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/role_mapping/${name}`,
      body: payload,
    });

    try {
      await pageObjects.securityRoleMappings.goto();
      await page.testSubj.locator('roleMappingName').click();
      await pageObjects.securityRoleMappings.saveRoleMapping();
    } finally {
      await kbnClient
        .request({ method: 'DELETE', path: `/internal/security/role_mapping/${name}` })
        .catch(() => {});
    }
  });
});
