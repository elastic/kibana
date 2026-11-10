/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { waitForAuditEvent } from '../fixtures/audit_log_file';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';
import {
  type TestWorkload,
  unbindWorkloads,
  workloadPath,
} from '../fixtures/service_account_workloads';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
const BULK_UPDATE_ENDPOINT = 'internal/service_accounts_test/_bulk_update';
const uniqueName = () => `sa-bulk-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

type Change =
  | { op: 'bind'; workloadId: string; serviceAccountId: string }
  | { op: 'unbind'; workloadId: string };

apiTest.describe(
  'Bulk update Elasticsearch service account workload bindings',
  { tag: ['@local-stateful-classic'] },
  () => {
    const accounts: ServiceAccountPrincipal[] = [];
    const workloads: TestWorkload[] = [];
    /** Grants `monitor`, which is what the test plugin's workload needs to run. */
    const roleName = uniqueName();
    let adminHeaders: Record<string, string>;

    const createAccount = async (apiClient: ApiClientFixture): Promise<string> => {
      const name = uniqueName();
      accounts.push({ namespace: 'kibana', name });
      const created = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        body: { name, roles: [roleName] },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      return `kibana/${name}`;
    };

    const newWorkload = (): string => {
      const workloadId = uniqueName();
      workloads.push({ workloadId });
      return workloadId;
    };

    const bulkUpdate = (
      apiClient: ApiClientFixture,
      changes: Change[],
      headers: Record<string, string> = adminHeaders
    ) =>
      apiClient.post(BULK_UPDATE_ENDPOINT, {
        headers,
        body: { changes },
        responseType: 'json',
      });

    const runWorkload = (apiClient: ApiClientFixture, workloadId: string) =>
      apiClient.post(workloadPath(workloadId), {
        headers: adminHeaders,
        body: { operation: 'execute' },
        responseType: 'json',
      });

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
    });

    apiTest.beforeEach(async ({ samlAuth }) => {
      adminHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
    });

    apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () => unbindWorkloads(kbnClient, workloads),
        async () => deleteServiceAccounts(esClient, config, accounts),
        async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Bulk binding fixture cleanup failed.')
          );
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'Service account bulk binding cleanup failed.');
      }
    });

    apiTest(
      'binds, rebinds and unbinds several workloads, each of which runs as its account',
      async ({ apiClient }) => {
        const first = await createAccount(apiClient);
        const second = await createAccount(apiClient);
        const rebound = newWorkload();
        const unbound = newWorkload();
        const neverBound = newWorkload();

        const bound = await bulkUpdate(apiClient, [
          { op: 'bind', workloadId: rebound, serviceAccountId: first },
          { op: 'bind', workloadId: unbound, serviceAccountId: second },
        ]);
        expect(bound).toHaveStatusCode(200);
        expect(bound.body.results).toMatchObject([
          {
            op: 'bind',
            ok: true,
            workloadId: rebound,
            binding: { workloadId: rebound, serviceAccountId: first, spaceId: 'default' },
          },
          {
            op: 'bind',
            ok: true,
            workloadId: unbound,
            binding: { workloadId: unbound, serviceAccountId: second },
          },
        ]);

        const reboundRun = await runWorkload(apiClient, rebound);
        expect(reboundRun).toHaveStatusCode(200);
        expect(reboundRun.body).toMatchObject({ username: first });
        const unboundRun = await runWorkload(apiClient, unbound);
        expect(unboundRun).toHaveStatusCode(200);
        expect(unboundRun.body).toMatchObject({ username: second });

        const changed = await bulkUpdate(apiClient, [
          { op: 'bind', workloadId: rebound, serviceAccountId: second },
          { op: 'unbind', workloadId: unbound },
          { op: 'unbind', workloadId: neverBound },
        ]);
        expect(changed).toHaveStatusCode(200);
        expect(changed.body.results).toStrictEqual([
          {
            op: 'bind',
            ok: true,
            workloadType: 'job',
            workloadId: rebound,
            binding: expect.objectContaining({ serviceAccountId: second }),
            previousServiceAccountId: first,
          },
          {
            op: 'unbind',
            ok: true,
            workloadType: 'job',
            workloadId: unbound,
            removed: true,
            previousServiceAccountId: second,
          },
          {
            op: 'unbind',
            ok: true,
            workloadType: 'job',
            workloadId: neverBound,
            removed: false,
          },
        ]);

        const afterRebind = await runWorkload(apiClient, rebound);
        expect(afterRebind).toHaveStatusCode(200);
        expect(afterRebind.body).toMatchObject({ username: second });
        expect(await runWorkload(apiClient, unbound)).toHaveStatusCode(404);
      }
    );

    apiTest(
      'refuses every change of a caller without manage_security, and audits each refusal',
      async ({ apiClient, samlAuth }) => {
        const since = Date.now();
        const account = await createAccount(apiClient);
        const toBind = newWorkload();
        const toUnbind = newWorkload();
        const viewerHeaders = {
          ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
          ...HEADERS,
        };

        const refused = await bulkUpdate(
          apiClient,
          [
            { op: 'bind', workloadId: toBind, serviceAccountId: account },
            { op: 'unbind', workloadId: toUnbind },
          ],
          viewerHeaders
        );
        expect(refused).toHaveStatusCode(200);
        expect(refused.body.results).toStrictEqual([
          {
            op: 'bind',
            ok: false,
            workloadType: 'job',
            workloadId: toBind,
            error: {
              statusCode: 403,
              message:
                'Cannot bind a service account to a workload: missing `manage_security` cluster privilege',
            },
          },
          {
            op: 'unbind',
            ok: false,
            workloadType: 'job',
            workloadId: toUnbind,
            error: {
              statusCode: 403,
              message:
                'Cannot unbind a service account from a workload: missing `manage_security` cluster privilege',
            },
          },
        ]);

        const bindEvent = await waitForAuditEvent(
          (record) =>
            record.event?.action === 'service_account_workload_bind' &&
            record.kibana?.workload?.id === toBind,
          { since }
        );
        expect(bindEvent).toMatchObject({
          event: { outcome: 'failure' },
          user: { target: { id: account } },
        });
        const unbindEvent = await waitForAuditEvent(
          (record) =>
            record.event?.action === 'service_account_workload_unbind' &&
            record.kibana?.workload?.id === toUnbind,
          { since }
        );
        expect(unbindEvent).toMatchObject({ event: { outcome: 'failure' } });

        expect(await runWorkload(apiClient, toBind)).toHaveStatusCode(404);
      }
    );

    apiTest('changes nothing when two changes name the same workload', async ({ apiClient }) => {
      const account = await createAccount(apiClient);
      const workloadId = newWorkload();
      const other = newWorkload();

      const rejected = await bulkUpdate(apiClient, [
        { op: 'bind', workloadId: other, serviceAccountId: account },
        { op: 'bind', workloadId, serviceAccountId: account },
        { op: 'unbind', workloadId },
      ]);
      expect(rejected).toHaveStatusCode(500);

      expect(await runWorkload(apiClient, other)).toHaveStatusCode(404);
      expect(await runWorkload(apiClient, workloadId)).toHaveStatusCode(404);
    });
  }
);
