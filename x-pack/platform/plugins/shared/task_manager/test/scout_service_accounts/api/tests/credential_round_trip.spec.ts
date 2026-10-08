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
const ENCRYPTED_CREDENTIAL_BYTES = 32;
const RUN_AS = {
  workloadType: 'task_manager_test',
  workloadId: 'credential-round-trip',
  spaceId: 'default',
  expectedServiceAccountId: null,
};
const STORED_CREDENTIAL = { type: 'service_account', ...RUN_AS };

const BULK_SCHEDULE_PATH = 'internal/task_manager_service_accounts_test/bulk_schedule';

const uniqueId = () => `task-manager-sa-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const taskPath = (id: string) => `internal/task_manager_service_accounts_test/tasks/${id}`;

interface StoredTask {
  credential?: Record<string, unknown>;
  encryptedCredential?: string;
  apiKey?: string;
}

apiTest.describe(
  'Task Manager service account credentials',
  { tag: ['@local-stateful-classic'] },
  () => {
    const taskIds: string[] = [];
    let headers: Record<string, string>;

    const scheduleTask = async (apiClient: ApiClientFixture, body: { runAs?: typeof RUN_AS }) => {
      const id = uniqueId();
      const response = await apiClient.post(taskPath(id), { headers, body, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      taskIds.push(id);
      return id;
    };

    const bulkScheduleTasks = (
      apiClient: ApiClientFixture,
      tasks: Array<{ id: string; runAs?: typeof RUN_AS }>
    ) => apiClient.post(BULK_SCHEDULE_PATH, { headers, body: { tasks }, responseType: 'json' });

    const updateTask = async (
      apiClient: ApiClientFixture,
      id: string,
      api: 'bulkUpdateState' | 'bulkUpdateSchedules'
    ) => {
      const response = await apiClient.post(`${taskPath(id)}/_update`, {
        headers,
        body: { api },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ ids: [id], errors: [] });
    };

    const decryptTask = (apiClient: ApiClientFixture, id: string) =>
      apiClient.get(`${taskPath(id)}/_decrypt`, { headers, responseType: 'json' });

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

    const expectEncryptedCredential = async (
      apiClient: ApiClientFixture,
      esClient: EsClient,
      id: string
    ) => {
      const stored = await readStoredTask(esClient, id);
      expect(stored.credential).toStrictEqual(STORED_CREDENTIAL);
      expect(stored.apiKey).toBeUndefined();

      const decrypted = await decryptTask(apiClient, id);
      expect(decrypted).toHaveStatusCode(200);
      expect(decrypted.body.credential).toStrictEqual(STORED_CREDENTIAL);
      expect(Buffer.from(decrypted.body.encryptedCredential, 'base64')).toHaveLength(
        ENCRYPTED_CREDENTIAL_BYTES
      );
      expect(decrypted.body.encryptedCredential).not.toBe(stored.encryptedCredential);
    };

    apiTest.beforeAll(async ({ samlAuth }) => {
      headers = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const id of taskIds) {
        const removed = await apiClient.delete(`internal/task_manager/tasks/${id}`, { headers });
        expect([200, 404]).toContain(removed.statusCode);
      }
    });

    apiTest(
      'stores the credential as plain attributes and its value encrypted',
      async ({ apiClient, esClient }) => {
        const id = await scheduleTask(apiClient, { runAs: RUN_AS });
        await expectEncryptedCredential(apiClient, esClient, id);
      }
    );

    apiTest(
      'bulk schedules a service account task and an API key task together',
      async ({ apiClient, esClient }) => {
        const serviceAccountTaskId = uniqueId();
        const apiKeyTaskId = uniqueId();
        taskIds.push(serviceAccountTaskId, apiKeyTaskId);

        const response = await bulkScheduleTasks(apiClient, [
          { id: serviceAccountTaskId, runAs: RUN_AS },
          { id: apiKeyTaskId },
        ]);
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ ids: [serviceAccountTaskId, apiKeyTaskId] });

        await expectEncryptedCredential(apiClient, esClient, serviceAccountTaskId);

        const apiKeyTask = await readStoredTask(esClient, apiKeyTaskId);
        expect(apiKeyTask.credential).toBeUndefined();
        expect(typeof apiKeyTask.apiKey).toBe('string');
        const decryptedApiKeyTask = await decryptTask(apiClient, apiKeyTaskId);
        expect(decryptedApiKeyTask).toHaveStatusCode(200);
        expect(decryptedApiKeyTask.body).toStrictEqual({ hasApiKey: true });
      }
    );

    apiTest(
      'does not let bulkSchedule overwrite a task that has a credential',
      async ({ apiClient, esClient }) => {
        const id = await scheduleTask(apiClient, { runAs: RUN_AS });
        const stored = await readStoredTask(esClient, id);
        const before = await decryptTask(apiClient, id);
        expect(before).toHaveStatusCode(200);

        const response = await bulkScheduleTasks(apiClient, [{ id }]);
        expect(response).toHaveStatusCode(409);
        expect(response.body.message).toBe(
          `Task "${id}" has a credential and can't be overwritten. Remove it and schedule it again.`
        );

        expect(await readStoredTask(esClient, id)).toStrictEqual(stored);
        const after = await decryptTask(apiClient, id);
        expect(after).toHaveStatusCode(200);
        expect(after.body).toStrictEqual(before.body);
      }
    );

    for (const api of ['bulkUpdateState', 'bulkUpdateSchedules'] as const) {
      apiTest(`keeps the credential decryptable after ${api}`, async ({ apiClient, esClient }) => {
        const id = await scheduleTask(apiClient, { runAs: RUN_AS });
        const { encryptedCredential } = await readStoredTask(esClient, id);
        const before = await decryptTask(apiClient, id);
        expect(before).toHaveStatusCode(200);

        await updateTask(apiClient, id, api);

        expect(await readStoredTask(esClient, id)).toMatchObject({
          credential: STORED_CREDENTIAL,
          encryptedCredential,
        });
        const after = await decryptTask(apiClient, id);
        expect(after).toHaveStatusCode(200);
        expect(after.body).toStrictEqual(before.body);
      });
    }

    apiTest(
      'fails to decrypt once the credential is changed outside Task Manager',
      async ({ apiClient }) => {
        const id = await scheduleTask(apiClient, { runAs: RUN_AS });
        expect(await decryptTask(apiClient, id)).toHaveStatusCode(200);

        const changed = await apiClient.post(`${taskPath(id)}/_change_credential`, {
          headers,
          body: { workloadId: 'another-workload' },
        });
        expect(changed).toHaveStatusCode(204);

        const decrypted = await decryptTask(apiClient, id);
        expect(decrypted).toHaveStatusCode(400);
        expect(decrypted.body.message).toContain(
          'Unable to decrypt attribute "encryptedCredential"'
        );
      }
    );

    apiTest(
      'keeps API key tasks decryptable after a merged update',
      async ({ apiClient, esClient }) => {
        const id = await scheduleTask(apiClient, {});
        const stored = await readStoredTask(esClient, id);
        expect(stored.credential).toBeUndefined();
        expect(typeof stored.apiKey).toBe('string');

        await updateTask(apiClient, id, 'bulkUpdateState');

        const decrypted = await decryptTask(apiClient, id);
        expect(decrypted).toHaveStatusCode(200);
        expect(decrypted.body).toStrictEqual({ hasApiKey: true });
      }
    );
  }
);
