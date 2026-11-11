/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

// The real Serverless role-query endpoint is required to catch incompatible ES sort payloads.
test.describe(
  'Serverless service account creation flyout',
  { tag: ['@local-serverless-security_complete', '@local-serverless-search'] },
  () => {
    const customRole = `scout-sa-role-${randomUUID()}`;
    const secondRole = `scout-sa-other-role-${randomUUID()}`;

    test.beforeAll(async ({ esClient }) => {
      await esClient.security.putRole({ name: customRole, cluster: ['monitor'] });
      await esClient.security.putRole({ name: secondRole, cluster: ['monitor'] });
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.security.deleteRole({ name: customRole });
      await esClient.security.deleteRole({ name: secondRole });
    });

    test('loads roles from Elasticsearch and allows selecting multiple roles', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      const { serviceAccounts } = pageObjects;
      await serviceAccounts.openCreateFlyout();
      await expect(serviceAccounts.description).toBeVisible();
      await expect(serviceAccounts.submitButton).toBeDisabled();
      await serviceAccounts.setName(`scout-sa-${randomUUID()}`);
      await serviceAccounts.openRoles();
      await expect(serviceAccounts.roleOption(customRole)).toBeVisible();
      await serviceAccounts.selectRole(customRole);
      await expect(serviceAccounts.roleOption(secondRole)).toBeVisible();
      await serviceAccounts.selectRole(secondRole);
      await serviceAccounts.closeRoles();
      await expect(serviceAccounts.rolesSelector).toContainText(customRole);
      await expect(serviceAccounts.rolesSelector).toContainText(secondRole);
      await expect(serviceAccounts.submitButton).toBeEnabled();
      await serviceAccounts.cancel();
      await expect(serviceAccounts.flyout).toBeHidden();
    });
  }
);
