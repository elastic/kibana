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
// Two runs have to fit in Scout's 60s test timeout.
const RUN_TIMEOUT_MS = 20_000;

const uniqueName = () => `task-manager-sa-run-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const taskPath = (id: string) => `internal/task_manager_service_accounts_test/tasks/${id}`;
const workloadPath = (workloadId: string) =>
  `internal/task_manager_service_accounts_test/workloads/${workloadId}`;
const accountPath = (id: string) => `internal/security/service_account/${encodeURIComponent(id)}`;

apiTest.describe('Task Manager service account runs', { tag: ['@local-stateful-classic'] }, () => {
  const roleName = uniqueName();
  const accountName = uniqueName();
  const serviceAccountId = `kibana/${accountName}`;
  const workloadId = uniqueName();
  const taskId = uniqueName();
  const tamperedTaskId = uniqueName();
  let headers: Record<string, string>;

  const readTask = async (esClient: EsClient, id: string) => {
    const { _source } = await esClient.get<{
      task: { state: string; status: string; attempts: number };
    }>({
      index: TASK_MANAGER_INDEX,
      id: `task:${id}`,
    });
    return _source?.task;
  };

  const readTaskState = async (esClient: EsClient) => {
    const task = await readTask(esClient, taskId);
    return task ? JSON.parse(task.state) : undefined;
  };

  const runSoon = async (apiClient: ApiClientFixture, id: string) => {
    const ranSoon = await apiClient.post(`internal/ftr/task_manager/${id}/run_soon`, {
      headers,
      responseType: 'json',
    });
    expect(ranSoon).toHaveStatusCode(200);
    expect(ranSoon.body).toStrictEqual({ id, forced: false });
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
    await esClient.security.putRole({ name: roleName, cluster: ['monitor'], refresh: 'wait_for' });

    const created = await apiClient.post('internal/security/service_account', {
      headers,
      body: { name: accountName, roles: [roleName] },
      responseType: 'json',
    });
    expect(created).toHaveStatusCode(200);

    const bound = await apiClient.post(workloadPath(workloadId), {
      headers,
      body: { operation: 'bind', serviceAccountId },
      responseType: 'json',
    });
    expect(bound).toHaveStatusCode(200);
  });

  apiTest.afterAll(async ({ apiClient, esClient, samlAuth }) => {
    const cleanupHeaders = {
      ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
      ...HEADERS,
    };
    const failures: Error[] = [];
    const cleanup = [
      ...[taskId, tamperedTaskId].map((id) => async () => {
        const removed = await apiClient.delete(`internal/task_manager/tasks/${id}`, {
          headers: cleanupHeaders,
        });
        expect([200, 404]).toContain(removed.statusCode);
      }),
      async () => {
        const unbound = await apiClient.post(workloadPath(workloadId), {
          headers: cleanupHeaders,
          body: { operation: 'unbind' },
          responseType: 'json',
        });
        expect(unbound).toHaveStatusCode(200);
      },
      // Also deletes the account's tokens and invalidates the access tokens it was issued.
      async () => {
        const deleted = await apiClient.delete(`${accountPath(serviceAccountId)}?force=true`, {
          headers: cleanupHeaders,
          responseType: 'json',
        });
        expect([200, 404]).toContain(deleted.statusCode);
      },
      async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
    ];
    for (const remove of cleanup) {
      try {
        await remove();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error('Run fixture cleanup failed.'));
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, 'Service account run cleanup failed.');
    }
  });

  apiTest(
    'runs as the bound service account, and fails as a user error once it is unbound',
    async ({ apiClient, esClient }) => {
      const scheduled = await apiClient.post(taskPath(taskId), {
        headers,
        body: {
          enabled: true,
          runAs: {
            workloadType: 'task_manager_test',
            workloadId,
            spaceId: 'default',
            expectedServiceAccountId: serviceAccountId,
          },
        },
        responseType: 'json',
      });
      expect(scheduled).toHaveStatusCode(200);

      await expect
        .poll(() => readTaskState(esClient), {
          timeout: RUN_TIMEOUT_MS,
          message: 'the task did not record a run',
        })
        .toStrictEqual({
          username: serviceAccountId,
          realm: '_service_account',
          principal: { type: 'service_account', variant: 'stack', serviceAccountId },
        });

      const unbound = await apiClient.post(workloadPath(workloadId), {
        headers,
        body: { operation: 'unbind' },
        responseType: 'json',
      });
      expect(unbound).toHaveStatusCode(200);
      expect(unbound.body).toStrictEqual({ deleted: true });

      // Metrics reset every 30s; resetting now leaves the next run's counts in place until then.
      await getTaskTypeRunMetrics(apiClient, true);
      await runSoon(apiClient, taskId);

      await expect
        .poll(() => getTaskTypeRunMetrics(apiClient, false), {
          timeout: RUN_TIMEOUT_MS,
          message: 'the run after unbinding was not counted as a user error',
        })
        .toMatchObject({ total: 1, success: 0, user_errors: 1, framework_errors: 0 });
    }
  );

  apiTest(
    'marks the task as failed without deleting it once its credential is changed outside Task Manager',
    async ({ apiClient, esClient }) => {
      const scheduled = await apiClient.post(taskPath(tamperedTaskId), {
        headers,
        body: {
          enabled: true,
          runAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          runAs: {
            workloadType: 'task_manager_test',
            workloadId,
            spaceId: 'default',
            expectedServiceAccountId: serviceAccountId,
          },
        },
        responseType: 'json',
      });
      expect(scheduled).toHaveStatusCode(200);

      const changed = await apiClient.post(`${taskPath(tamperedTaskId)}/_change_credential`, {
        headers,
        body: { workloadId: 'another-workload' },
      });
      expect(changed).toHaveStatusCode(204);

      await runSoon(apiClient, tamperedTaskId);

      await expect
        .poll(async () => (await readTask(esClient, tamperedTaskId))?.status, {
          timeout: RUN_TIMEOUT_MS,
          message: 'the task with a changed credential was not marked as failed',
        })
        .toBe('failed');
      // It never ran, and the attempt its claim used up was given back.
      expect(await readTask(esClient, tamperedTaskId)).toMatchObject({ state: '{}', attempts: 0 });
    }
  );
});
