/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe('Secure roles and permissions', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/logstash_functional');
    await kbnClient.importExport.load(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/discover'
    );
    await kbnClient.uiSettings.replace({ defaultIndex: 'logstash-*' });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(
      'x-pack/platform/test/functional/fixtures/kbn_archives/security/discover'
    );
  });

  test.describe('role creation via UI', () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole({
        elasticsearch: { cluster: ['manage_security'], indices: [], run_as: [] },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      });
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.security.deleteRole({ name: 'logstash_reader_perm_test' }).catch(() => {});
      await esClient.security.deleteUser({ username: 'Rashmi' }).catch(() => {});
    });

    test('should add new role logstash_reader', async ({ pageObjects }) => {
      await pageObjects.securityRoles.goto();
      await pageObjects.securityRoles.createRole('logstash_reader_perm_test', {
        elasticsearch: {
          indices: [
            {
              names: ['logstash-*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
        },
      });

      const roles = await pageObjects.securityRoles.getAllRoles();
      expect(roles.some((r) => r.rolename === 'logstash_reader_perm_test')).toBe(true);
    });

    test('should add new user Rashmi with logstash_reader role', async ({ pageObjects }) => {
      await pageObjects.securityUsers.createUser({
        username: 'Rashmi',
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'RashmiFirst RashmiLast',
        email: 'rashmi@myEmail.com',
        roles: ['logstash_reader_perm_test'],
      });

      const users = await pageObjects.securityUsers.getAllUsers();
      const user = users.find((u) => u.username === 'Rashmi');
      expect(user).toBeDefined();
      expect(user!.roles).toContain('logstash_reader_perm_test');
      expect(user!.fullname).toBe('RashmiFirst RashmiLast');
      expect(user!.reserved).toBe(false);
    });
  });

  test('Kibana User without manage_security does not have link to user management', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
    });

    await page.gotoApp('management');
    await expect(page.testSubj.locator('users')).toBeHidden();
  });

  test('Kibana User with read access can navigate to Discover and see export button', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          base: [],
          feature: { discover: ['read'] },
          spaces: ['*'],
        },
      ],
    });

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await expect(page.testSubj.locator('shareTopNavButton')).toBeVisible();
  });
});
