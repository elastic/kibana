/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';
import {
  type TestWorkload,
  unbindWorkloads,
  workloadPath,
} from '../fixtures/service_account_workloads';

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
const CLEANUP_ENDPOINT = 'internal/service_accounts_test/_binding_cleanup';
const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
/** How long to keep running the cleanup before the binding must be gone. */
const CLEANUP_TIMEOUT_MS = 60_000;
/** Task Manager claims tasks every few seconds, so there is no point in asking sooner. */
const CLEANUP_POLL_INTERVAL_MS = 3_000;

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const accountPath = (id: string) => `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;

// The stateful config set sets the cleanup's grace period to zero, so a binding is considered as
// soon as it exists. The task runs when the spec asks it to.
apiTest.describe(
  'Stale service account binding cleanup',
  { tag: ['@local-stateful-classic'] },
  () => {
    const created: ServiceAccountPrincipal[] = [];
    const boundWorkloads: TestWorkload[] = [];
    const workloadRole = `sa-cleanup-${unique()}`;
    let adminHeaders: Record<string, string>;

    const idOf = ({ namespace, name }: ServiceAccountPrincipal) => `${namespace}/${name}`;

    const createAccount = async (apiClient: ApiClientFixture) => {
      const account = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: `sa-cleanup-${unique()}` };
      created.push(account);
      const response = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        body: { name: account.name, roles: [workloadRole] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return account;
    };

    const bind = async (
      apiClient: ApiClientFixture,
      workloadId: string,
      account: ServiceAccountPrincipal
    ) => {
      boundWorkloads.push({ workloadId });
      const bound = await apiClient.post(workloadPath(workloadId), {
        headers: adminHeaders,
        body: { operation: 'bind', serviceAccountId: idOf(account) },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
    };

    const boundWorkloadIds = async (
      apiClient: ApiClientFixture,
      account: ServiceAccountPrincipal
    ) => {
      const response = await apiClient.get(`${accountPath(idOf(account))}/workloads`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return (response.body as { workloads: Array<{ workloadId: string }> }).workloads
        .map(({ workloadId }) => workloadId)
        .sort();
    };

    /** Runs the cleanup until the account's bound workloads match `expected`. */
    const cleanUpUntil = async (
      apiClient: ApiClientFixture,
      account: ServiceAccountPrincipal,
      expected: string[]
    ) => {
      await expect
        .poll(
          async () => {
            const run = await apiClient.post(CLEANUP_ENDPOINT, { headers: adminHeaders });
            expect([204, 409]).toContain(run.statusCode);
            return boundWorkloadIds(apiClient, account);
          },
          { timeout: CLEANUP_TIMEOUT_MS, intervals: [CLEANUP_POLL_INTERVAL_MS] }
        )
        .toStrictEqual(expected);
    };

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.security.putRole({
        name: workloadRole,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
    });

    apiTest.beforeEach(async ({ samlAuth }) => {
      adminHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
    });

    apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
      const failures: Error[] = [];
      for (const remove of [
        async () => unbindWorkloads(kbnClient, boundWorkloads),
        async () => deleteServiceAccounts(esClient, config, created),
        async () => esClient.security.deleteRole({ name: workloadRole, refresh: 'wait_for' }),
      ]) {
        try {
          await remove();
        } catch (error) {
          failures.push(error instanceof Error ? error : new Error('Cleanup failed.'));
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'Stale binding cleanup spec teardown failed.');
      }
    });

    apiTest(
      'removes the binding of a workload its type reports missing, and keeps the others',
      async ({ apiClient }) => {
        const account = await createAccount(apiClient);
        const gone = `missing-${unique()}`;
        const live = `job-${unique()}`;
        await bind(apiClient, gone, account);
        await bind(apiClient, live, account);
        expect(await boundWorkloadIds(apiClient, account)).toStrictEqual([live, gone].sort());

        await cleanUpUntil(apiClient, account, [live]);
      }
    );

    apiTest(
      'removes the bindings of an account that was deleted while still bound',
      async ({ apiClient }) => {
        const account = await createAccount(apiClient);
        const workloadId = `job-${unique()}`;
        await bind(apiClient, workloadId, account);

        const forced = await apiClient.delete(`${accountPath(idOf(account))}?force=true`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(forced).toHaveStatusCode(200);
        // Force delete leaves the binding behind on purpose. The cleanup is what removes it.
        expect(await boundWorkloadIds(apiClient, account)).toStrictEqual([workloadId]);

        await cleanUpUntil(apiClient, account, []);
      }
    );
  }
);
