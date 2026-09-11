/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const customRole = 'myroleEast';
const customUser = 'userEast';

test.describe('Document Level Security', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/security/dlstest');
    await kbnClient.uiSettings.replace({ defaultIndex: 'dlstest' });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username: customUser }).catch(() => {});
    await esClient.security.deleteRole({ name: customRole }).catch(() => {});
  });

  test.describe('role and user creation via UI', () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole({
        elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      });
    });

    test(`should add new role ${customRole}`, async ({ pageObjects }) => {
      await pageObjects.securityRoles.goto();
      await pageObjects.securityRoles.createRole(customRole, {
        elasticsearch: {
          indices: [
            {
              names: ['dlstest'],
              privileges: ['read', 'view_index_metadata'],
              query: '{"match": {"region": "EAST"}}',
            },
          ],
        },
      });

      const roles = await pageObjects.securityRoles.getAllRoles();
      expect(roles.some((r) => r.rolename === customRole)).toBe(true);
      expect(roles.find((r) => r.rolename === customRole)!.reserved).toBe(false);
    });

    test(`should add new user ${customUser}`, async ({ pageObjects }) => {
      await pageObjects.securityUsers.createUser({
        username: customUser,
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'dls EAST',
        email: 'dlstest@elastic.com',
        roles: ['kibana_admin', customRole],
      });

      const users = await pageObjects.securityUsers.getAllUsers();
      const user = users.find((u) => u.username === customUser);
      expect(user).toBeDefined();
      expect(user!.roles).toContain(customRole);
      expect(user!.reserved).toBe(false);
    });
  });

  test('user East should only see EAST doc in Discover', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        indices: [
          {
            names: ['dlstest'],
            privileges: ['read', 'view_index_metadata'],
            // @ts-ignore — query is a valid DLS field
            query: '{"match": {"region": "EAST"}}',
          },
        ],
      },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await expect(pageObjects.discover.getHitCountLocator()).toHaveText('1');
    const rowData = await pageObjects.discover.getDocTableIndex(1);
    expect(rowData).toContain('EAST');
  });
});
