/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import type { ApiClientFixture, EsClient } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { deleteUiamServiceAccount } from '../fixtures/uiam_service_account_cleanup';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const ORG_ADMIN_HEADERS = {
  ...HEADERS,
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
};
const TASK_MANAGER_INDEX = '.kibana_task_manager';
const TASK_TYPE = 'taskManagerServiceAccountsTest:runAs';
const RUN_TIMEOUT_MS = 20_000;

const uniqueName = () => `task-manager-uiam-run-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const taskPath = (id: string) => `internal/task_manager_service_accounts_test/tasks/${id}`;
const workloadPath = (workloadId: string) =>
  `internal/task_manager_service_accounts_test/workloads/${workloadId}`;

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Task Manager UIAM service account runs',
  { tag: ['@local-serverless-search'] },
  () => {
    const taskIds: string[] = [];
    const workloadIds: string[] = [];
    let serviceAccountId: string | undefined;
    let headers: Record<string, string>;

    const ranAsServiceAccount = () => ({
      username: serviceAccountId,
      realm: '_cloud_service_account',
      principal: { type: 'service_account', variant: 'uiam', serviceAccountId },
    });

    const bindWorkload = async (apiClient: ApiClientFixture) => {
      const workloadId = uniqueName();
      workloadIds.push(workloadId);
      const bound = await apiClient.post(workloadPath(workloadId), {
        headers,
        body: { operation: 'bind', serviceAccountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
      return workloadId;
    };

    const scheduleTask = async (apiClient: ApiClientFixture, workloadId: string) => {
      const id = uniqueName();
      taskIds.push(id);
      const scheduled = await apiClient.post(taskPath(id), {
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
      return id;
    };

    const readTaskState = async (esClient: EsClient, id: string) => {
      const { _source } = await esClient.get<{ task: { state: string } }>({
        index: TASK_MANAGER_INDEX,
        id: `task:${id}`,
      });
      return _source ? JSON.parse(_source.task.state) : undefined;
    };

    const getTaskTypeRunMetrics = async (apiClient: ApiClientFixture, reset: boolean) => {
      const response = await apiClient.get(`api/task_manager/metrics?reset=${reset}`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body.metrics?.task_run?.value.by_type[TASK_TYPE];
    };

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      // Interactive login seeds the local UIAM organization key used to create the account.
      headers = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };

      const created = await apiClient.post('internal/security/service_account', {
        headers: ORG_ADMIN_HEADERS,
        body: { name: uniqueName(), roles: ['viewer'] },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      serviceAccountId = created.body.id;
    });

    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
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
        async () => {
          if (serviceAccountId) {
            await deleteUiamServiceAccount(serviceAccountId);
          }
        },
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('UIAM run fixture cleanup failed.')
          );
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'UIAM service account run cleanup failed.');
      }
    });

    apiTest('runs as the bound UIAM service account', async ({ apiClient, esClient }) => {
      const workloadId = await bindWorkload(apiClient);
      // Metrics reset every 120s on Serverless; resetting now leaves the next run's counts in
      // place until then.
      await getTaskTypeRunMetrics(apiClient, true);
      const id = await scheduleTask(apiClient, workloadId);

      await expect
        .poll(() => readTaskState(esClient, id), {
          timeout: RUN_TIMEOUT_MS,
          message: 'the task did not record a run',
        })
        .toStrictEqual(ranAsServiceAccount());

      await expect
        .poll(() => getTaskTypeRunMetrics(apiClient, false), {
          timeout: RUN_TIMEOUT_MS,
          message: 'the run was not counted as a success',
        })
        .toMatchObject({ total: 1, success: 1, user_errors: 0, framework_errors: 0 });
    });

    apiTest(
      'fails as a user error once the workload is unbound',
      async ({ apiClient, esClient }) => {
        const workloadId = await bindWorkload(apiClient);
        const id = await scheduleTask(apiClient, workloadId);
        await expect
          .poll(() => readTaskState(esClient, id), {
            timeout: RUN_TIMEOUT_MS,
            message: 'the task did not record its first run',
          })
          .toStrictEqual(ranAsServiceAccount());

        const unbound = await apiClient.post(workloadPath(workloadId), {
          headers,
          body: { operation: 'unbind' },
          responseType: 'json',
        });
        expect(unbound).toHaveStatusCode(200);
        expect(unbound.body).toStrictEqual({ deleted: true });

        await getTaskTypeRunMetrics(apiClient, true);
        const ranSoon = await apiClient.post(`internal/ftr/task_manager/${id}/run_soon`, {
          headers,
          responseType: 'json',
        });
        expect(ranSoon).toHaveStatusCode(200);
        expect(ranSoon.body).toStrictEqual({ id, forced: false });

        await expect
          .poll(() => getTaskTypeRunMetrics(apiClient, false), {
            timeout: RUN_TIMEOUT_MS,
            message: 'the run after unbinding was not counted as a user error',
          })
          .toMatchObject({ total: 1, success: 0, user_errors: 1, framework_errors: 0 });
        expect(await readTaskState(esClient, id)).toStrictEqual(ranAsServiceAccount());
      }
    );
  }
);
