/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import type { Role } from '../../../../common';
import { test } from '../fixtures';

const cases = [
  {
    role: 'a_viewssnrole',
    username: 'customer1',
    fullName: 'customer one',
    fields: ['customer_ssn', 'customer_name', 'customer_region', 'customer_type'],
    seesSsn: true,
  },
  {
    role: 'a_view_no_ssn_role',
    username: 'customer2',
    fullName: 'customer two',
    fields: ['customer_name', 'customer_region', 'customer_type'],
    seesSsn: false,
  },
];

const caseSensitiveRole = 'a_casesenstive_fields_role';

test.describe('Field Level Security', { tag: tags.stateful.classic }, () => {
  let defaultIndex: string | undefined;

  test.beforeAll(async ({ esArchiver, kbnClient, apiServices }) => {
    const previousDefaultIndex = await kbnClient.uiSettings.getDefaultIndex();
    defaultIndex = typeof previousDefaultIndex === 'string' ? previousDefaultIndex : undefined;
    await esArchiver.loadIfNeeded(
      'x-pack/platform/test/fixtures/es_archives/security/flstest/data'
    );
    await kbnClient.importExport.load(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/flstest/index_pattern'
    );
    const dataViewId = await apiServices.dataViews.getIdByTitle('flstest');
    await kbnClient.uiSettings.update({ defaultIndex: dataViewId });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test.afterEach(async ({ esClient }) => {
    for (const { role, username } of cases) {
      await esClient.security.deleteUser({ username }, { ignore: [404] });
      await esClient.security.deleteRole({ name: role }, { ignore: [404] });
    }
    await esClient.security.deleteRole({ name: caseSensitiveRole }, { ignore: [404] });
  });

  test.afterAll(async ({ kbnClient }) => {
    if (defaultIndex === undefined) {
      await kbnClient.uiSettings.unset('defaultIndex');
    } else {
      await kbnClient.uiSettings.update({ defaultIndex });
    }
    await kbnClient.importExport.unload(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/flstest/index_pattern'
    );
  });

  for (const { role, username, fullName, fields, seesSsn } of cases) {
    test(`UI-created user ${username} ${seesSsn ? 'sees' : 'cannot see'} SSN in Discover`, async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.securityRoles.goto();
      await pageObjects.securityRoles.createRole(role, {
        elasticsearch: {
          indices: [
            {
              names: ['flstest'],
              privileges: ['read', 'view_index_metadata'],
              field_security: { grant: fields },
            },
          ],
        },
      });
      const roles = await pageObjects.securityRoles.getAllRoles();
      expect(roles.find((entry) => entry.rolename === role)?.reserved).toBe(false);

      await pageObjects.securityUsers.createUser({
        username,
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: fullName,
        email: 'flstest@elastic.com',
        roles: ['kibana_admin', role],
      });
      const users = await pageObjects.securityUsers.getAllUsers();
      expect(users.find((user) => user.username === username)?.roles).toStrictEqual([
        'kibana_admin',
        role,
      ]);

      await page.context().clearCookies();
      await pageObjects.login.loginWithUsernamePassword(username, 'changeme');
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.selectDataView('flstest', { createAdHocIfMissing: false });
      await expect(pageObjects.discover.getHitCountLocator()).toHaveText('2');
      const rowData = await pageObjects.discover.getDocTableIndex(1);
      expect(rowData.includes('ssn')).toBe(seesSsn);
    });
  }

  test('should support case-sensitive fields', async ({ pageObjects, kbnClient }) => {
    const indices = [
      {
        names: ['flstest'],
        privileges: ['read', 'view_index_metadata'],
        field_security: {
          grant: ['customer_*', 'Customer_*'],
          except: ['customer_region', 'Customer_region'],
        },
      },
    ];
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole(caseSensitiveRole, { elasticsearch: { indices } });

    const { data: role } = await kbnClient.request<Role>({
      method: 'GET',
      path: `/api/security/role/${caseSensitiveRole}`,
    });
    expect(role).toStrictEqual({
      _transform_error: [],
      _unrecognized_applications: [],
      elasticsearch: {
        cluster: [],
        indices: indices.map((index) => ({ ...index, allow_restricted_indices: false })),
        run_as: [],
      },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      metadata: {},
      name: caseSensitiveRole,
      transient_metadata: { enabled: true },
    });
  });
});
