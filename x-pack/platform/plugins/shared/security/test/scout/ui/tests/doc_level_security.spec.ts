/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import type { RoleIndexPrivilege } from '../fixtures/page_objects';

const customRole = 'myroleEast';
const customUser = 'userEast';
const dataIndex = 'dlstest';
const dataArchive = 'x-pack/platform/test/fixtures/es_archives/security/dlstest';

const manageSecurityRole: KibanaRole = {
  elasticsearch: { cluster: ['manage_security'], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

const eastOnlyIndexPrivileges: RoleIndexPrivilege[] = [
  {
    names: [dataIndex],
    privileges: ['read', 'view_index_metadata'],
    query: '{"match": {"region": "EAST"}}',
  },
];

const eastOnlyRole: KibanaRole = {
  elasticsearch: { cluster: [], indices: eastOnlyIndexPrivileges },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

test.describe('Document Level Security', { tag: tags.stateful.classic }, () => {
  let dataViewId: string | undefined;
  let defaultIndex: string | undefined;

  test.beforeAll(async ({ apiServices, esArchiver, kbnClient }) => {
    const previousDefaultIndex = await kbnClient.uiSettings.getDefaultIndex();
    defaultIndex = typeof previousDefaultIndex === 'string' ? previousDefaultIndex : undefined;
    await esArchiver.loadIfNeeded(dataArchive);
    const { data: dataView } = await apiServices.dataViews.create({
      title: dataIndex,
      override: true,
    });
    dataViewId = dataView.id;
    await kbnClient.uiSettings.update({ defaultIndex: dataViewId });
  });

  test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
    await esClient.security.deleteUser({ username: customUser }).catch(() => {});
    await esClient.security.deleteRole({ name: customRole }).catch(() => {});
    if (defaultIndex === undefined) {
      await kbnClient.uiSettings.unset('defaultIndex');
    } else {
      await kbnClient.uiSettings.update({ defaultIndex });
    }
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId);
    }
    await esClient.indices.delete({ index: dataIndex, ignore_unavailable: true });
  });

  test(`should add new role ${customRole}`, async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(manageSecurityRole);
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole(customRole, {
      elasticsearch: { indices: eastOnlyIndexPrivileges },
    });

    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === customRole)).toBe(true);
    expect(roles.find((r) => r.rolename === customRole)!.reserved).toBe(false);
  });

  test(`should add new user ${customUser}`, async ({ browserAuth, esClient, pageObjects }) => {
    await esClient.security.putRole({ name: customRole, indices: eastOnlyIndexPrivileges });
    await browserAuth.loginWithCustomRole(manageSecurityRole);
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

  test('user East should only see EAST doc in Discover', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(eastOnlyRole);

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView(dataIndex, { createAdHocIfMissing: false });
    await expect(pageObjects.discover.getHitCountLocator()).toHaveText('1');
    const rowData = await pageObjects.discover.getDocTableIndex(1);
    expect(rowData).toContain('EAST');
  });
});
