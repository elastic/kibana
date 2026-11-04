/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { KbnClient, KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../../api/fixtures/service_account_cleanup';
import {
  bindWorkload,
  type TestWorkload,
  unbindWorkloads,
} from '../../api/fixtures/service_account_workloads';
import { test } from '../fixtures';

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
/** Deleting a service account takes `manage_security`. The feature privilege opens Stack Management. */
const SERVICE_ACCOUNT_ADMIN_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_security'] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};

const uniqueName = (prefix: string) => `${prefix}-${randomUUID()}`;

test.describe('Delete service accounts', { tag: ['@local-stateful-classic'] }, () => {
  const workloadRole = uniqueName('scout-sa-delete-role');
  const created: ServiceAccountPrincipal[] = [];
  const boundWorkloads: TestWorkload[] = [];

  const idOf = (name: string) => `${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`;

  const createAccount = async (kbnClient: KbnClient, name: string) => {
    created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });
    await kbnClient.request({
      method: 'POST',
      path: SERVICE_ACCOUNT_ENDPOINT,
      body: { name, roles: [workloadRole] },
      retries: 0,
    });
  };

  const getAccountStatus = async (kbnClient: KbnClient, name: string) => {
    const { status } = await kbnClient.request({
      method: 'GET',
      path: `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(idOf(name))}`,
      ignoreErrors: [404],
    });
    return status;
  };

  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putRole({
      name: workloadRole,
      cluster: ['monitor'],
      refresh: 'wait_for',
    });
  });

  test.afterAll(async ({ esClient, kbnClient, config }) => {
    const failures: Error[] = [];
    const cleanup = [
      // A forced delete leaves its bindings behind.
      async () => unbindWorkloads(kbnClient, boundWorkloads),
      async () => deleteServiceAccounts(esClient, config, created),
      async () => esClient.security.deleteRole({ name: workloadRole, refresh: 'wait_for' }),
    ];
    for (const remove of cleanup) {
      try {
        await remove();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error('Delete UI cleanup failed.'));
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, 'Service account delete UI cleanup failed.');
    }
  });

  test('deletes an account that is not bound to any workload', async ({
    browserAuth,
    kbnClient,
    pageObjects,
  }) => {
    const name = uniqueName('scout-sa-unbound');
    await createAccount(kbnClient, name);

    await browserAuth.loginWithCustomRole(SERVICE_ACCOUNT_ADMIN_ROLE);
    const { serviceAccounts, toasts } = pageObjects;
    await serviceAccounts.goto();
    await serviceAccounts.searchFor(name);
    await expect(serviceAccounts.accountRow(name)).toBeVisible();

    await test.step('confirm the delete', async () => {
      await serviceAccounts.openDelete(name);
      await expect(serviceAccounts.deleteConfirmModal).toContainText(`Delete "${name}"?`);
      await expect(serviceAccounts.boundModal).toBeHidden();
      await serviceAccounts.confirmDelete();
    });

    await test.step('the account is gone', async () => {
      // The success toast tells a delete apart from one that found the account already gone.
      await toasts.waitForToastWithText(`Deleted service account "${name}"`);
      await serviceAccounts.waitForReload();
      await expect(serviceAccounts.accountRow(name)).toBeHidden();
      expect(await getAccountStatus(kbnClient, name)).toBe(404);
    });
  });

  test('force deletes an account that is still bound to a workload', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    const name = uniqueName('scout-sa-bound');
    const workloadId = uniqueName('scout-sa-job');
    await createAccount(kbnClient, name);
    boundWorkloads.push({ workloadId });
    await bindWorkload(kbnClient, workloadId, idOf(name));

    await browserAuth.loginWithCustomRole(SERVICE_ACCOUNT_ADMIN_ROLE);
    const { serviceAccounts, toasts } = pageObjects;
    await serviceAccounts.goto();
    await serviceAccounts.searchFor(name);
    await expect(serviceAccounts.accountRow(name)).toBeVisible();

    await test.step('warn about the bound workload', async () => {
      await serviceAccounts.openDelete(name);
      await expect(serviceAccounts.boundModal).toContainText(`Delete "${name}"?`);
      await expect(serviceAccounts.boundModal).toContainText(
        'This account is bound to the following 1 workload.'
      );
      await expect(serviceAccounts.deleteConfirmModal).toBeHidden();
      // `toContainText`, since EUI adds hidden copy markers to each cell's text.
      await expect(await serviceAccounts.boundWorkloadsTable.cells('displayName')).toContainText([
        `Test job ${workloadId}`,
      ]);
      await expect(await serviceAccounts.boundWorkloadsTable.cells('workloadType')).toContainText([
        'Test job',
      ]);
      const link = serviceAccounts.boundWorkloadLink(`Test job ${workloadId}`);
      await expect(link).toHaveAttribute('href', `/app/service_accounts_test/jobs/${workloadId}`);
      await expect(link).toHaveAttribute('target', '_blank');
    });

    await test.step('the warning has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="serviceAccountBoundModal"]'],
      });
      expect(violations).toStrictEqual([]);
    });

    await test.step('force delete the account', async () => {
      await serviceAccounts.forceDelete();
    });

    await test.step('the account is gone', async () => {
      await toasts.waitForToastWithText(`Deleted service account "${name}"`);
      await serviceAccounts.waitForReload();
      await expect(serviceAccounts.accountRow(name)).toBeHidden();
      expect(await getAccountStatus(kbnClient, name)).toBe(404);
    });
  });
});
