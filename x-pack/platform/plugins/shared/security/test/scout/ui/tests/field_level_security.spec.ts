/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

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

test.describe('Field Level Security', { tag: tags.stateful.classic }, () => {
  let defaultIndex: string | undefined;
  let dataViewId: string | undefined;
  const dataViewName = `flstest-${randomUUID()}`;

  test.beforeAll(async ({ esArchiver, kbnClient, apiServices }) => {
    const previousDefaultIndex = await kbnClient.uiSettings.getDefaultIndex();
    defaultIndex = typeof previousDefaultIndex === 'string' ? previousDefaultIndex : undefined;
    await esArchiver.loadIfNeeded(
      'x-pack/platform/test/fixtures/es_archives/security/flstest/data'
    );
    const { data: dataView } = await apiServices.dataViews.create({
      id: dataViewName,
      name: dataViewName,
      title: 'flstest',
    });
    dataViewId = dataView.id;
    await kbnClient.uiSettings.update({ defaultIndex: dataViewId });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    if (defaultIndex === undefined) {
      await kbnClient.uiSettings.unset('defaultIndex');
    } else {
      await kbnClient.uiSettings.update({ defaultIndex });
    }
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId);
    }
  });

  for (const scenario of cases) {
    test(`UI-created user ${scenario.username} ${
      scenario.seesSsn ? 'sees' : 'cannot see'
    } SSN in Discover`, async ({ pageObjects, page, esClient }) => {
      const role = `${scenario.role}-${randomUUID()}`;
      const username = `${scenario.username}-${randomUUID()}`;
      try {
        await pageObjects.securityRoles.goto();
        await pageObjects.securityRoles.createRole(role, {
          elasticsearch: {
            indices: [
              {
                names: ['flstest'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: scenario.fields },
              },
            ],
          },
        });
        expect((await pageObjects.securityRoles.getRole(role)).reserved).toBe(false);

        await pageObjects.securityUsers.createUser({
          username,
          password: 'changeme',
          confirm_password: 'changeme',
          full_name: scenario.fullName,
          email: 'flstest@elastic.com',
          roles: ['kibana_admin', role],
        });
        expect((await pageObjects.securityUsers.getUser(username)).roles).toStrictEqual([
          'kibana_admin',
          role,
        ]);

        await page.context().clearCookies();
        await pageObjects.login.loginWithUsernamePassword(username, 'changeme');
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.selectDataView(dataViewName, { createAdHocIfMissing: false });
        await expect(pageObjects.discover.getHitCountLocator()).toHaveText('2');
        const rowData = await pageObjects.discover.getDocTableIndex(1);
        expect(rowData.includes('ssn')).toBe(scenario.seesSsn);
      } finally {
        await esClient.security.deleteUser({ username }, { ignore: [404] });
        await esClient.security.deleteRole({ name: role }, { ignore: [404] });
      }
    });
  }

  test('should support case-sensitive fields', async ({ pageObjects, kbnClient, esClient }) => {
    const caseSensitiveRole = `a_casesensitive_fields_role-${randomUUID()}`;
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
    try {
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
    } finally {
      await esClient.security.deleteRole({ name: caseSensitiveRole }, { ignore: [404] });
    }
  });
});
