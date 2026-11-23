/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, registerAiIndex, testData } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, API_HEADERS, CONTEXT_ENGINE_READ, SESSION_EVENTS_SAVE_PATH } =
  testData;

const GLOBAL_SETTINGS_PATH = '/internal/kibana/global_settings';

interface GlobalUiSettingsResponse {
  settings?: Record<string, { userValue?: boolean }>;
}

const RUN_ID = randomUUID().slice(0, 8);
const OTHER_SPACE_ID = `ce-events-other-${RUN_ID}`;
const WRITABLE_INDEX = `ai-index-idx-scout-events-writable-${RUN_ID}`;
const FORBIDDEN_INDEX = `ai-index-idx-scout-events-forbidden-${RUN_ID}`;
const WRITABLE_AI_INDEX_ID = `scout-events-writable-${RUN_ID}`;
const FORBIDDEN_AI_INDEX_ID = `scout-events-forbidden-${RUN_ID}`;
const MISSING_AI_INDEX_ID = `scout-events-missing-${RUN_ID}`;
const TARGET_USER_ID = `scout-other-user-${RUN_ID}`;

const spacePath = (spaceId: string, path: string) => `s/${spaceId}/${path}`;

const metaEvent = (id: string) => ({
  id,
  type: 'meta',
  turn_id: 'turn-1',
  event_at: '2026-11-16T09:58:00.000Z',
});

const READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [CONTEXT_ENGINE_READ],
};

const OTHER_SPACE_WRITE_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [WRITABLE_INDEX], privileges: ['write'] }],
  },
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['all'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

const DEFAULT_SPACE_MANAGE_MEMORY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [WRITABLE_INDEX], privileges: ['write'] }],
  },
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['all', 'manage_memory'] },
      spaces: [DEFAULT_SPACE_ID],
    },
    {
      base: [],
      feature: { contextEngine: ['all'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

const OTHER_SPACE_MANAGE_MEMORY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [WRITABLE_INDEX], privileges: ['write'] }],
  },
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['all', 'manage_memory'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

apiTest.describe('context engine session events API', { tag: tags.stateful.classic }, () => {
  let initialMemorySetting: { value: boolean | undefined } | undefined;
  let adminCredentials: RoleApiCredentials;
  let readOnlyCredentials: RoleApiCredentials;
  let otherSpaceWriteCredentials: RoleApiCredentials;
  let defaultSpaceManageMemoryCredentials: RoleApiCredentials;
  let otherSpaceManageMemoryCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient, apiClient }) => {
    const { data } = await kbnClient.request<GlobalUiSettingsResponse>({
      method: 'GET',
      path: GLOBAL_SETTINGS_PATH,
    });
    initialMemorySetting = {
      value: data.settings?.[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]?.userValue,
    };

    await kbnClient.uiSettings.updateGlobal({
      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
    });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();

    await kbnClient.spaces.create({ id: OTHER_SPACE_ID, name: 'CE session events other space' });

    await esClient.indices.create({ index: WRITABLE_INDEX });
    await esClient.indices.create({ index: FORBIDDEN_INDEX });

    adminCredentials = await requestAuth.getApiKey('admin');
    readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(READ_ONLY_ROLE);
    otherSpaceWriteCredentials = await requestAuth.getApiKeyForCustomRole(OTHER_SPACE_WRITE_ROLE);
    defaultSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
      DEFAULT_SPACE_MANAGE_MEMORY_ROLE
    );
    otherSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
      OTHER_SPACE_MANAGE_MEMORY_ROLE
    );

    const adminHeaders = { ...adminCredentials.apiKeyHeader, ...API_HEADERS };
    for (const [id, index] of [
      [WRITABLE_AI_INDEX_ID, WRITABLE_INDEX],
      [FORBIDDEN_AI_INDEX_ID, FORBIDDEN_INDEX],
    ] as const) {
      const response = await apiClient.post(spacePath(OTHER_SPACE_ID, AI_INDEX_COLLECTION_PATH), {
        headers: adminHeaders,
        responseType: 'json',
        body: registerAiIndex(id, { type: 'index', value: index }),
      });
      expect(response).toHaveStatusCode(201);
    }
  });

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    if (adminCredentials) {
      const adminHeaders = { ...adminCredentials.apiKeyHeader, ...API_HEADERS };
      for (const id of [WRITABLE_AI_INDEX_ID, FORBIDDEN_AI_INDEX_ID]) {
        await apiClient.delete(spacePath(OTHER_SPACE_ID, `${AI_INDEX_COLLECTION_PATH}/${id}`), {
          headers: adminHeaders,
          responseType: 'json',
        });
      }
    }
    await esClient.indices.delete({ index: [WRITABLE_INDEX, FORBIDDEN_INDEX] }, { ignore: [404] });
    await kbnClient.spaces.delete(OTHER_SPACE_ID);

    if (initialMemorySetting) {
      if (initialMemorySetting.value === undefined) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${GLOBAL_SETTINGS_PATH}/${CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID}`,
        });
      } else {
        await kbnClient.uiSettings.updateGlobal({
          [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: initialMemorySetting.value,
        });
      }
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
    }
  });

  apiTest('enforces contextEngine:write per space', async ({ apiClient }) => {
    const body = { session_id: `session-denied-${RUN_ID}`, events: [metaEvent('evt-denied')] };

    await apiTest.step('rejects a read-only caller in the non-default space', async () => {
      const response = await apiClient.post(spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH), {
        headers: { ...readOnlyCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(403);
    });

    await apiTest.step(
      'rejects a caller whose write privilege is scoped to another space',
      async () => {
        const response = await apiClient.post(SESSION_EVENTS_SAVE_PATH, {
          headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body,
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  });

  apiTest(
    'saves events for the caller in the non-default space without manage_memory',
    async ({ apiClient }) => {
      const response = await apiClient.post(spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH), {
        headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: {
          session_id: `session-own-${RUN_ID}`,
          ai_index_ids: [WRITABLE_AI_INDEX_ID],
          events: [metaEvent('evt-own')],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        results: [{ id: 'evt-own', status: 'created' }],
      });
    }
  );

  apiTest(
    'resolves contextEngine:manage_memory in the request space when targeting another user',
    async ({ apiClient }) => {
      const otherUserBody = {
        session_id: `session-managed-${RUN_ID}`,
        user_id: TARGET_USER_ID,
        ai_index_ids: [WRITABLE_AI_INDEX_ID],
        events: [metaEvent('evt-managed')],
      };

      await apiTest.step('rejects when manage_memory is missing', async () => {
        const response = await apiClient.post(spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH), {
          headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: otherUserBody,
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body).toMatchObject({
          message: expect.stringContaining('contextEngine:manage_memory'),
        });
      });

      await apiTest.step(
        'rejects when manage_memory is only granted in the default space',
        async () => {
          const response = await apiClient.post(
            spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH),
            {
              headers: { ...defaultSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: otherUserBody,
            }
          );

          expect(response).toHaveStatusCode(403);
          expect(response.body).toMatchObject({
            message: expect.stringContaining('contextEngine:manage_memory'),
          });
        }
      );

      await apiTest.step('allows when manage_memory is granted in the request space', async () => {
        const response = await apiClient.post(spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH), {
          headers: { ...otherSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: otherUserBody,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          results: [{ id: 'evt-managed', status: 'created' }],
        });
      });
    }
  );

  apiTest(
    'checks AI index existence and Elasticsearch write privileges in the request space',
    async ({ apiClient }) => {
      await apiTest.step(
        'returns 403 when the caller lacks write on the backing index',
        async () => {
          const response = await apiClient.post(
            spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH),
            {
              headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: {
                session_id: `session-forbidden-index-${RUN_ID}`,
                ai_index_ids: [FORBIDDEN_AI_INDEX_ID],
                events: [metaEvent('evt-forbidden')],
              },
            }
          );

          expect(response).toHaveStatusCode(403);
          expect(response.body).toMatchObject({
            message: expect.stringContaining(FORBIDDEN_AI_INDEX_ID),
          });
        }
      );

      await apiTest.step(
        'returns 404 when the AI index is not registered in the space',
        async () => {
          const response = await apiClient.post(
            spacePath(OTHER_SPACE_ID, SESSION_EVENTS_SAVE_PATH),
            {
              headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: {
                session_id: `session-missing-index-${RUN_ID}`,
                ai_index_ids: [MISSING_AI_INDEX_ID],
                events: [metaEvent('evt-missing')],
              },
            }
          );

          expect(response).toHaveStatusCode(404);
        }
      );
    }
  );
});
