/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const TASK_MANAGER_INDEX = '.kibana_task_manager';
const TASK_TYPE = 'taskManagerServiceAccountsTest:runAs';
const RUN_TIMEOUT_MS = 20_000;
// Longer than the 15s access token timeout the config set gives Elasticsearch.
const RENEW_AFTER_MS = 16_000;

const uniqueName = () =>
  `task-manager-sa-lifecycle-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const taskPath = (id: string) => `internal/task_manager_service_accounts_test/tasks/${id}`;
const workloadPath = (workloadId: string) =>
  `internal/task_manager_service_accounts_test/workloads/${workloadId}`;
const accountPath = (id: string) => `internal/security/service_account/${encodeURIComponent(id)}`;
const runAsFor = (workloadId: string, expectedServiceAccountId: string) => ({
  workloadType: 'task_manager_test',
  workloadId,
  spaceId: 'default',
  expectedServiceAccountId,
});
const ranAs = (serviceAccountId: string) => ({
  username: serviceAccountId,
  realm: '_service_account',
  principal: { type: 'service_account', variant: 'stack', serviceAccountId },
});

interface StoredTask {
  status: string;
  attempts: number;
  state: string;
  credential?: Record<string, unknown>;
  encryptedCredential?: string;
  userScope?: { apiKeyId: string };
}

interface ScheduleBody {
  enabled?: boolean;
  runAt?: string;
  runAs?: ReturnType<typeof runAsFor>;
  params?: { expectedServiceAccountId?: string; renewAfterMs?: number };
}

apiTest.describe(
  'Task Manager service account task lifecycle',
  { tag: ['@local-stateful-classic'] },
  () => {
    const roleName = uniqueName();
    const accountA = `kibana/${uniqueName()}`;
    const accountB = `kibana/${uniqueName()}`;
    const taskIds: string[] = [];
    const workloadIds: string[] = [];
    let headers: Record<string, string>;

    const scheduleTask = async (apiClient: ApiClientFixture, body: ScheduleBody) => {
      const id = uniqueName();
      taskIds.push(id);
      const response = await apiClient.post(taskPath(id), { headers, body, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      return id;
    };

    const removeTask = async (apiClient: ApiClientFixture, id: string) => {
      const removed = await apiClient.delete(`internal/task_manager/tasks/${id}`, { headers });
      expect(removed).toHaveStatusCode(200);
    };

    const runSoon = async (apiClient: ApiClientFixture, id: string) => {
      const ranSoon = await apiClient.post(`internal/ftr/task_manager/${id}/run_soon`, {
        headers,
        responseType: 'json',
      });
      expect(ranSoon).toHaveStatusCode(200);
      expect(ranSoon.body).toStrictEqual({ id, forced: false });
    };

    const bindWorkload = async (
      apiClient: ApiClientFixture,
      serviceAccountId: string,
      workloadId = uniqueName()
    ) => {
      if (!workloadIds.includes(workloadId)) {
        workloadIds.push(workloadId);
      }
      const bound = await apiClient.post(workloadPath(workloadId), {
        headers,
        body: { operation: 'bind', serviceAccountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
      return workloadId;
    };

    const unbindWorkload = async (apiClient: ApiClientFixture, workloadId: string) => {
      const unbound = await apiClient.post(workloadPath(workloadId), {
        headers,
        body: { operation: 'unbind' },
        responseType: 'json',
      });
      expect(unbound).toHaveStatusCode(200);
      expect(unbound.body).toStrictEqual({ deleted: true });
    };

    const readStoredTask = async (esClient: EsClient, id: string): Promise<StoredTask> => {
      const { _source } = await esClient.get<{ task: StoredTask }>({
        index: TASK_MANAGER_INDEX,
        id: `task:${id}`,
      });
      if (!_source) {
        throw new Error(`Task document "${id}" has no source`);
      }
      return _source.task;
    };

    const readTaskState = async (esClient: EsClient, id: string) =>
      JSON.parse((await readStoredTask(esClient, id)).state);

    const readInvalidationMarkers = async (esClient: EsClient) => {
      const { hits } = await esClient.search<{ api_key_to_invalidate?: { apiKeyId?: string } }>({
        index: TASK_MANAGER_INDEX,
        size: 1000,
        query: { term: { type: 'api_key_to_invalidate' } },
      });
      return hits.hits.map(({ _id, _source }) => ({
        id: _id,
        apiKeyId: _source?.api_key_to_invalidate?.apiKeyId,
      }));
    };

    const getTaskTypeRunMetrics = async (apiClient: ApiClientFixture, reset: boolean) => {
      const response = await apiClient.get(`api/task_manager/metrics?reset=${reset}`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body.metrics?.task_run?.value.by_type[TASK_TYPE];
    };

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      headers = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
      for (const accountId of [accountA, accountB]) {
        const created = await apiClient.post('internal/security/service_account', {
          headers,
          body: { name: accountId.replace('kibana/', ''), roles: [roleName] },
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
      }
    });

    apiTest.afterAll(async ({ apiClient, esClient, samlAuth }) => {
      const cleanupHeaders = {
        ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
        ...HEADERS,
      };
      const failures: Error[] = [];
      const cleanup = [
        ...taskIds.map((id) => async () => {
          const removed = await apiClient.delete(`internal/task_manager/tasks/${id}`, {
            headers: cleanupHeaders,
          });
          expect([200, 404]).toContain(removed.statusCode);
        }),
        ...workloadIds.map((workloadId) => async () => {
          const unbound = await apiClient.post(workloadPath(workloadId), {
            headers: cleanupHeaders,
            body: { operation: 'unbind' },
            responseType: 'json',
          });
          expect(unbound).toHaveStatusCode(200);
        }),
        // Also deletes the accounts' tokens and invalidates the access tokens they were issued.
        ...[accountA, accountB].map((accountId) => async () => {
          const deleted = await apiClient.delete(`${accountPath(accountId)}?force=true`, {
            headers: cleanupHeaders,
            responseType: 'json',
          });
          expect([200, 404]).toContain(deleted.statusCode);
        }),
        async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Lifecycle fixture cleanup failed.')
          );
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'Service account lifecycle cleanup failed.');
      }
    });

    apiTest('runs as the bound service account', async ({ apiClient, esClient }) => {
      const workloadId = await bindWorkload(apiClient, accountA);
      // Metrics reset every 30s; resetting now leaves the next run's counts in place until then.
      await getTaskTypeRunMetrics(apiClient, true);
      const id = await scheduleTask(apiClient, {
        enabled: true,
        runAs: runAsFor(workloadId, accountA),
      });

      await expect
        .poll(() => readTaskState(esClient, id), {
          timeout: RUN_TIMEOUT_MS,
          message: 'the task did not record a run',
        })
        .toStrictEqual(ranAs(accountA));

      await expect
        .poll(() => getTaskTypeRunMetrics(apiClient, false), {
          timeout: RUN_TIMEOUT_MS,
          message: 'the run was not counted as a success',
        })
        .toMatchObject({ total: 1, success: 1, user_errors: 0, framework_errors: 0 });
    });

    apiTest(
      'removes a service account task without marking an API key for invalidation',
      async ({ apiClient, esClient }) => {
        const workloadId = await bindWorkload(apiClient, accountA);
        const serviceAccountTaskId = await scheduleTask(apiClient, {
          enabled: true,
          runAs: runAsFor(workloadId, accountA),
        });
        await expect
          .poll(() => readTaskState(esClient, serviceAccountTaskId), {
            timeout: RUN_TIMEOUT_MS,
            message: 'the service account task did not record a run',
          })
          .toStrictEqual(ranAs(accountA));

        const apiKeyTaskId = await scheduleTask(apiClient, {});
        const { userScope } = await readStoredTask(esClient, apiKeyTaskId);
        expect(typeof userScope?.apiKeyId).toBe('string');
        const markers = await readInvalidationMarkers(esClient);

        await removeTask(apiClient, serviceAccountTaskId);
        await removeTask(apiClient, apiKeyTaskId);

        const markerIds = new Set(markers.map(({ id }) => id));
        const newMarkers = (await readInvalidationMarkers(esClient)).filter(
          ({ id }) => !markerIds.has(id)
        );
        expect(newMarkers.map(({ apiKeyId }) => apiKeyId)).toStrictEqual([userScope?.apiKeyId]);
      }
    );

    apiTest(
      'runs the replacement task as the new service account after an identity transition',
      async ({ apiClient, esClient }) => {
        const workloadId = await bindWorkload(apiClient, accountA);
        const oldTaskId = await scheduleTask(apiClient, {
          enabled: true,
          runAs: runAsFor(workloadId, accountA),
        });
        await expect
          .poll(() => readTaskState(esClient, oldTaskId), {
            timeout: RUN_TIMEOUT_MS,
            message: 'the old task did not record a run',
          })
          .toStrictEqual(ranAs(accountA));

        await bindWorkload(apiClient, accountB, workloadId);
        // Held back so the replacement first runs only after the old task is removed.
        const newTaskId = await scheduleTask(apiClient, {
          enabled: true,
          runAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          runAs: runAsFor(workloadId, accountB),
        });
        const { credential, encryptedCredential } = await readStoredTask(esClient, newTaskId);
        await removeTask(apiClient, oldTaskId);
        expect(await readTaskState(esClient, newTaskId)).toStrictEqual({});
        await runSoon(apiClient, newTaskId);

        await expect
          .poll(() => readTaskState(esClient, newTaskId), {
            timeout: RUN_TIMEOUT_MS,
            message: 'the replacement task did not record a run',
          })
          .toStrictEqual(ranAs(accountB));
        expect(await readStoredTask(esClient, newTaskId)).toMatchObject({
          credential,
          encryptedCredential,
        });
        expect(await esClient.exists({ index: TASK_MANAGER_INDEX, id: `task:${oldTaskId}` })).toBe(
          false
        );
      }
    );

    apiTest(
      'rejects a run-time service account that differs from the stored one as a user error',
      async ({ apiClient, esClient }) => {
        const workloadId = await bindWorkload(apiClient, accountA);
        await getTaskTypeRunMetrics(apiClient, true);
        const id = await scheduleTask(apiClient, {
          enabled: true,
          runAs: runAsFor(workloadId, accountA),
          params: { expectedServiceAccountId: accountB },
        });

        await expect
          .poll(
            async () => {
              const { status, attempts } = await readStoredTask(esClient, id);
              return { status, attempts };
            },
            { timeout: RUN_TIMEOUT_MS, message: 'the task did not finish a failed run' }
          )
          .toStrictEqual({ status: 'idle', attempts: 1 });
        expect(await readTaskState(esClient, id)).toStrictEqual({});

        await expect
          .poll(() => getTaskTypeRunMetrics(apiClient, false), {
            timeout: RUN_TIMEOUT_MS,
            message: 'the run was not counted as a user error',
          })
          .toMatchObject({ total: 1, success: 0, user_errors: 1, framework_errors: 0 });
      }
    );

    apiTest(
      'refuses an in-flight run its next token once the workload is unbound',
      async ({ apiClient, esClient }) => {
        const workloadId = await bindWorkload(apiClient, accountA);
        const id = await scheduleTask(apiClient, {
          enabled: true,
          runAs: runAsFor(workloadId, accountA),
          params: { renewAfterMs: RENEW_AFTER_MS },
        });
        await expect
          .poll(
            async () => {
              const response = await apiClient.get(`${taskPath(id)}/_in_flight`, {
                headers,
                responseType: 'json',
              });
              expect(response).toHaveStatusCode(200);
              return response.body.username;
            },
            { timeout: RUN_TIMEOUT_MS, message: 'the run did not authenticate' }
          )
          .toBe(accountA);

        await unbindWorkload(apiClient, workloadId);

        await expect
          .poll(() => readTaskState(esClient, id), {
            timeout: RENEW_AFTER_MS + RUN_TIMEOUT_MS,
            message: 'the run did not record its renewal',
          })
          .toStrictEqual({ ...ranAs(accountA), renewalStatus: 401 });
      }
    );
  }
);
