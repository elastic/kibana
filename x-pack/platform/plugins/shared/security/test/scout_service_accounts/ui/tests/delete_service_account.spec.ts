/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../../api/fixtures/service_account_cleanup';
import { test } from '../fixtures';

const SERVICE_ACCOUNT_ENDPOINT = '/internal/security/service_account';
/** The service accounts test plugin's workload route, which binds and unbinds its workloads. */
const workloadPath = (workloadId: string) => `/internal/service_accounts_test/${workloadId}`;
const uniqueName = (prefix: string) => `${prefix}-${randomUUID()}`;

test.describe('Delete service accounts', { tag: ['@local-stateful-classic'] }, () => {
  const workloadRole = uniqueName('scout-sa-delete-role');
  const created: ServiceAccountPrincipal[] = [];
  const boundWorkloads: string[] = [];

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

  const bindWorkload = async (kbnClient: KbnClient, workloadId: string, name: string) => {
    boundWorkloads.push(workloadId);
    await kbnClient.request({
      method: 'POST',
      path: workloadPath(workloadId),
      body: { operation: 'bind', serviceAccountId: idOf(name) },
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
      async () => {
        for (const workloadId of boundWorkloads) {
          await kbnClient.request({
            method: 'POST',
            path: workloadPath(workloadId),
            body: { operation: 'unbind' },
          });
        }
      },
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

    // Deleting a service account takes `manage_security`.
    await browserAuth.loginAsAdmin();
    const { serviceAccounts } = pageObjects;
    await serviceAccounts.goto();
    await serviceAccounts.searchFor(name);
    await expect(serviceAccounts.accountRow(name)).toBeVisible();

    await test.step('confirm the delete', async () => {
      await serviceAccounts.openDelete(name);
      await expect(serviceAccounts.deleteConfirmModal).toContainText(`Delete "${name}"?`);
      await expect(serviceAccounts.boundModal).toBeHidden();
      await serviceAccounts.confirmDelete();
      await expect(serviceAccounts.deleteConfirmModal).toBeHidden();
    });

    await test.step('the account is gone', async () => {
      await expect(serviceAccounts.accountRow(name)).toBeHidden();
      expect(await getAccountStatus(kbnClient, name)).toBe(404);
    });
  });

  test('force deletes an account that is still bound to workloads', async ({
    browserAuth,
    kbnClient,
    pageObjects,
  }) => {
    const name = uniqueName('scout-sa-bound');
    await createAccount(kbnClient, name);
    // One more than a page, so the list pages.
    const workloadIds = Array.from({ length: 6 }, () => uniqueName('scout-sa-job'));
    for (const workloadId of workloadIds) {
      await bindWorkload(kbnClient, workloadId, name);
    }

    await browserAuth.loginAsAdmin();
    const { serviceAccounts } = pageObjects;
    await serviceAccounts.goto();
    await serviceAccounts.searchFor(name);
    await expect(serviceAccounts.accountRow(name)).toBeVisible();

    await test.step('warn about the bound workloads', async () => {
      await serviceAccounts.openDelete(name);
      await expect(serviceAccounts.boundModal).toContainText(`Delete "${name}"?`);
      await expect(serviceAccounts.boundModal).toContainText(
        'This account is bound to the following 6 workloads.'
      );
      await expect(serviceAccounts.deleteConfirmModal).toBeHidden();
      await expect(serviceAccounts.boundWorkloadRows).toHaveCount(5);
      await serviceAccounts.goToBoundWorkloadsPage(1);
      await expect(serviceAccounts.boundWorkloadRows).toHaveCount(1);
    });

    await test.step('force delete the account', async () => {
      await serviceAccounts.forceDelete();
      await expect(serviceAccounts.boundModal).toBeHidden();
    });

    await test.step('the account is gone', async () => {
      await expect(serviceAccounts.accountRow(name)).toBeHidden();
      expect(await getAccountStatus(kbnClient, name)).toBe(404);
    });
  });
});
