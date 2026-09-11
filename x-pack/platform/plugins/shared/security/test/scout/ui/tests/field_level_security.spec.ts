/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Field Level Security', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(
      'x-pack/platform/test/fixtures/es_archives/security/flstest/data'
    );
    await kbnClient.importExport.load(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/flstest/index_pattern'
    );
  });

  test.afterAll(async ({ kbnClient, esClient }) => {
    await kbnClient.importExport.unload(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/flstest/index_pattern'
    );
    await esClient.security.deleteRole({ name: 'a_viewssnrole' }).catch(() => {});
    await esClient.security.deleteRole({ name: 'a_view_no_ssn_role' }).catch(() => {});
    await esClient.security.deleteRole({ name: 'a_casesenstive_fields_role' }).catch(() => {});
    await esClient.security.deleteUser({ username: 'customer1' }).catch(() => {});
    await esClient.security.deleteUser({ username: 'customer2' }).catch(() => {});
  });

  test('should add new role a_viewssnrole', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole('a_viewssnrole', {
      elasticsearch: {
        indices: [
          {
            names: ['flstest'],
            privileges: ['read', 'view_index_metadata'],
            field_security: {
              grant: ['customer_ssn', 'customer_name', 'customer_region', 'customer_type'],
            },
          },
        ],
      },
    });

    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === 'a_viewssnrole')).toBe(true);
    expect(roles.find((r) => r.rolename === 'a_viewssnrole')!.reserved).toBe(false);
  });

  test('should add new role a_view_no_ssn_role', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole('a_view_no_ssn_role', {
      elasticsearch: {
        indices: [
          {
            names: ['flstest'],
            privileges: ['read', 'view_index_metadata'],
            field_security: {
              grant: ['customer_name', 'customer_region', 'customer_type'],
            },
          },
        ],
      },
    });

    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === 'a_view_no_ssn_role')).toBe(true);
  });

  test('should add new user customer1', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityUsers.createUser({
      username: 'customer1',
      password: 'changeme',
      confirm_password: 'changeme',
      full_name: 'customer one',
      email: 'flstest@elastic.com',
      roles: ['kibana_admin', 'a_viewssnrole'],
    });

    const users = await pageObjects.securityUsers.getAllUsers();
    const user = users.find((u) => u.username === 'customer1');
    expect(user).toBeDefined();
    expect(user!.roles).toContain('a_viewssnrole');
  });

  test('should add new user customer2', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityUsers.createUser({
      username: 'customer2',
      password: 'changeme',
      confirm_password: 'changeme',
      full_name: 'customer two',
      email: 'flstest@elastic.com',
      roles: ['kibana_admin', 'a_view_no_ssn_role'],
    });

    const users = await pageObjects.securityUsers.getAllUsers();
    const user = users.find((u) => u.username === 'customer2');
    expect(user).toBeDefined();
    expect(user!.roles).toContain('a_view_no_ssn_role');
  });

  test('should support case-sensitive fields', async ({ browserAuth, pageObjects, esClient }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole('a_casesenstive_fields_role', {
      elasticsearch: {
        indices: [
          {
            names: ['flstest'],
            privileges: ['read', 'view_index_metadata'],
            field_security: {
              grant: ['customer_*', 'Customer_*'],
              except: ['customer_region', 'Customer_region'],
            },
          },
        ],
      },
    });

    const roleDef = await esClient.security.getRole({ name: 'a_casesenstive_fields_role' });
    const indexEntry = roleDef.a_casesenstive_fields_role?.indices?.[0];
    expect(indexEntry?.field_security?.grant).toStrictEqual(
      expect.arrayContaining(['customer_*', 'Customer_*'])
    );
    expect(indexEntry?.field_security?.except).toStrictEqual(
      expect.arrayContaining(['customer_region', 'Customer_region'])
    );
  });

  test('user with SSN access (a_viewssnrole) should see ssn field in Discover', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['flstest'],
            privileges: ['read', 'view_index_metadata'],
            // @ts-ignore — field_security is a valid FLS field
            field_security: {
              grant: ['customer_ssn', 'customer_name', 'customer_region', 'customer_type'],
            },
          },
        ],
      },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await expect(pageObjects.discover.getHitCountLocator()).toHaveText('2');
    const rowData = await pageObjects.discover.getDocTableIndex(1);
    expect(rowData).toContain('ssn');
  });

  test('user without SSN access (a_view_no_ssn_role) should not see ssn field in Discover', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['flstest'],
            privileges: ['read', 'view_index_metadata'],
            // @ts-ignore — field_security is a valid FLS field
            field_security: {
              grant: ['customer_name', 'customer_region', 'customer_type'],
            },
          },
        ],
      },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await expect(pageObjects.discover.getHitCountLocator()).toHaveText('2');
    const rowData = await pageObjects.discover.getDocTableIndex(1);
    expect(rowData).not.toContain('ssn');
  });
});
