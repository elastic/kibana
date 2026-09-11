/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const customRole = 'rc-custom-role';

test.describe('Remote Cluster Privileges', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/security/dlstest');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: ['manage_security'], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteRole({ name: customRole }).catch(() => {});
  });

  test(`should add new role ${customRole} with remote cluster privileges`, async ({
    pageObjects,
  }) => {
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.createRole(customRole, {
      elasticsearch: {
        indices: [
          {
            names: ['dlstest'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
        remote_cluster: [
          {
            clusters: ['cluster1', 'cluster2'],
            privileges: ['monitor_enrich'],
          },
        ],
      },
    });

    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === customRole)).toBe(true);
    expect(roles.find((r) => r.rolename === customRole)!.reserved).toBe(false);
  });

  test(`should update role ${customRole} with remote cluster privileges`, async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.securityRoles.goto();
    await pageObjects.securityRoles.clickEditRole(customRole);

    await expect(page).toHaveURL(/security\/roles\/edit/);

    const { clusters, privileges } = await pageObjects.securityRoles.getRemoteClusterPrivilege(0);
    expect(clusters).toStrictEqual(expect.arrayContaining(['cluster1', 'cluster2']));
    expect(privileges).toStrictEqual(expect.arrayContaining(['monitor_enrich']));

    await pageObjects.securityRoles.deleteRemoteClusterPrivilege(0);
    await pageObjects.securityRoles.addRemoteClusterPrivilege({
      clusters: ['cluster3', 'cluster4'],
      privileges: ['monitor_enrich'],
    });

    await pageObjects.securityRoles.saveRole();
    const roles = await pageObjects.securityRoles.getAllRoles();
    expect(roles.some((r) => r.rolename === customRole)).toBe(true);
  });
});
