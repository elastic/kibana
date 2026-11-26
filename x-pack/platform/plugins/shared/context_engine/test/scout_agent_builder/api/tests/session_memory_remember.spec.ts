/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, registerAiIndex, testData } from '../fixtures';

const {
  AI_INDEX_COLLECTION_PATH,
  API_HEADERS,
  CONTEXT_ENGINE_READ,
  SESSION_MEMORY_FORGET_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
} = testData;

const SESSION_MEMORY_DATA_STREAM = '.context-engine-session-memory';
const KIBANA_ORIGIN_HEADERS = { 'x-elastic-product-origin': 'kibana' };
const GLOBAL_SETTINGS_PATH = '/internal/kibana/global_settings';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface GlobalUiSettingsResponse {
  settings?: Record<string, { userValue?: boolean }>;
}

const RUN_ID = randomUUID().slice(0, 8);
const OTHER_SPACE_ID = `ce-remember-other-${RUN_ID}`;
const WRITABLE_INDEX = `ai-index-idx-scout-remember-writable-${RUN_ID}`;
const FORBIDDEN_INDEX = `ai-index-idx-scout-remember-forbidden-${RUN_ID}`;
const WRITABLE_AI_INDEX_ID = `scout-remember-writable-${RUN_ID}`;
const FORBIDDEN_AI_INDEX_ID = `scout-remember-forbidden-${RUN_ID}`;
const DEFAULT_SPACE_AI_INDEX_ID = `scout-remember-default-space-${RUN_ID}`;
const TARGET_USER_ID = `scout-remember-other-user-${RUN_ID}`;
const SEED_ROLE_NAME = `ce-scout-remember-seed-${RUN_ID}`;
const SEED_USERNAME = `ce-scout-remember-seed-${RUN_ID}`;
const SEED_PASSWORD = `scout-seed-${randomUUID()}`;
const SEEDED_REVISABLE_MEMORY_ID = `mem-revisable-${RUN_ID}`;
const SEEDED_FORGOTTEN_MEMORY_ID = `mem-forgotten-${RUN_ID}`;

const SEED_SESSION_ID = `session-seed-${RUN_ID}`;
const DENIED_SESSION_ID = `session-denied-${RUN_ID}`;
const OWN_SESSION_ID = `session-own-${RUN_ID}`;
const MANAGED_SESSION_ID = `session-managed-${RUN_ID}`;
const FORBIDDEN_INDEX_SESSION_ID = `session-forbidden-index-${RUN_ID}`;
const MISSING_INDEX_SESSION_ID = `session-missing-index-${RUN_ID}`;
const TEST_SESSION_IDS = [
  SEED_SESSION_ID,
  DENIED_SESSION_ID,
  OWN_SESSION_ID,
  MANAGED_SESSION_ID,
  FORBIDDEN_INDEX_SESSION_ID,
  MISSING_INDEX_SESSION_ID,
];

const spacePath = (spaceId: string, path: string) => `s/${spaceId}/${path}`;

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

apiTest.describe(
  'context engine session memory _remember API',
  { tag: tags.stateful.classic },
  () => {
    let initialMemorySetting: { value: boolean | undefined } | undefined;
    let spaceCreated = false;
    let seedEsClient: Client;
    let adminCredentials: RoleApiCredentials;
    let readOnlyCredentials: RoleApiCredentials;
    let otherSpaceWriteCredentials: RoleApiCredentials;
    let defaultSpaceManageMemoryCredentials: RoleApiCredentials;
    let otherSpaceManageMemoryCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient, apiClient, config }) => {
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

      await kbnClient.spaces.create({ id: OTHER_SPACE_ID, name: 'CE session memory other space' });
      spaceCreated = true;

      await esClient.indices.create({ index: WRITABLE_INDEX });
      await esClient.indices.create({ index: FORBIDDEN_INDEX });

      await esClient.security.putRole({
        name: SEED_ROLE_NAME,
        refresh: 'wait_for',
        indices: [
          {
            names: [SESSION_MEMORY_DATA_STREAM],
            privileges: ['all'],
            allow_restricted_indices: true,
          },
        ],
      });
      await esClient.security.putUser({
        username: SEED_USERNAME,
        password: SEED_PASSWORD,
        roles: [SEED_ROLE_NAME],
        refresh: 'wait_for',
      });
      seedEsClient = new Client({
        node: config.hosts.elasticsearch,
        auth: { username: SEED_USERNAME, password: SEED_PASSWORD },
        headers: KIBANA_ORIGIN_HEADERS,
        tls: { rejectUnauthorized: false },
      });

      adminCredentials = await requestAuth.getApiKey('admin');
      readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(READ_ONLY_ROLE);
      otherSpaceWriteCredentials = await requestAuth.getApiKeyForCustomRole(OTHER_SPACE_WRITE_ROLE);
      defaultSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
        DEFAULT_SPACE_MANAGE_MEMORY_ROLE
      );
      otherSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
        OTHER_SPACE_MANAGE_MEMORY_ROLE
      );

      const { api_keys: apiKeys } = await esClient.security.getApiKey({
        id: otherSpaceWriteCredentials.apiKey.id,
        with_profile_uid: true,
      });
      const callerProfileUid = apiKeys[0]?.profile_uid;
      expect(callerProfileUid).toBeDefined();

      const seededTimestamp = new Date(Date.now() - 60_000).toISOString();
      const bulkResult = await seedEsClient.bulk({
        operations: [SEEDED_REVISABLE_MEMORY_ID, SEEDED_FORGOTTEN_MEMORY_ID].flatMap((id) => [
          { create: { _index: SESSION_MEMORY_DATA_STREAM } },
          {
            '@timestamp': seededTimestamp,
            id,
            space: OTHER_SPACE_ID,
            session_id: SEED_SESSION_ID,
            user_id: callerProfileUid,
          },
        ]),
        refresh: true,
      });
      expect(bulkResult.errors).toBe(false);

      const adminHeaders = { ...adminCredentials.apiKeyHeader, ...API_HEADERS };
      for (const [path, id, index] of [
        [spacePath(OTHER_SPACE_ID, AI_INDEX_COLLECTION_PATH), WRITABLE_AI_INDEX_ID, WRITABLE_INDEX],
        [
          spacePath(OTHER_SPACE_ID, AI_INDEX_COLLECTION_PATH),
          FORBIDDEN_AI_INDEX_ID,
          FORBIDDEN_INDEX,
        ],
        [AI_INDEX_COLLECTION_PATH, DEFAULT_SPACE_AI_INDEX_ID, WRITABLE_INDEX],
      ] as const) {
        const response = await apiClient.post(path, {
          headers: adminHeaders,
          responseType: 'json',
          body: registerAiIndex(id, { type: 'index', value: index }),
        });
        expect(response).toHaveStatusCode(201);
      }
    });

    apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
      const cleanupErrors: unknown[] = [];

      try {
        if (seedEsClient) {
          try {
            await seedEsClient.indices.refresh({
              index: SESSION_MEMORY_DATA_STREAM,
              ignore_unavailable: true,
            });
            await seedEsClient.deleteByQuery(
              {
                index: SESSION_MEMORY_DATA_STREAM,
                query: {
                  bool: {
                    should: [
                      { term: { space: OTHER_SPACE_ID } },
                      { terms: { session_id: TEST_SESSION_IDS } },
                    ],
                    minimum_should_match: 1,
                  },
                },
                refresh: true,
              },
              { ignore: [404] }
            );
          } catch (error) {
            cleanupErrors.push(error);
          } finally {
            try {
              await seedEsClient.close();
            } catch (error) {
              cleanupErrors.push(error);
            }
          }
        }
        if (adminCredentials) {
          const adminHeaders = { ...adminCredentials.apiKeyHeader, ...API_HEADERS };
          const aiIndexResults = await Promise.allSettled([
            ...[WRITABLE_AI_INDEX_ID, FORBIDDEN_AI_INDEX_ID].map((id) =>
              apiClient.delete(spacePath(OTHER_SPACE_ID, `${AI_INDEX_COLLECTION_PATH}/${id}`), {
                headers: adminHeaders,
                responseType: 'json',
              })
            ),
            apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${DEFAULT_SPACE_AI_INDEX_ID}`, {
              headers: adminHeaders,
              responseType: 'json',
            }),
          ]);
          for (const result of aiIndexResults) {
            if (result.status === 'rejected') {
              cleanupErrors.push(result.reason);
            }
          }
        }
        const resourceResults = await Promise.allSettled([
          esClient.indices.delete({ index: [WRITABLE_INDEX, FORBIDDEN_INDEX] }, { ignore: [404] }),
          esClient.security
            .deleteUser({ username: SEED_USERNAME }, { ignore: [404] })
            .finally(() =>
              esClient.security.deleteRole({ name: SEED_ROLE_NAME }, { ignore: [404] })
            ),
          ...(spaceCreated ? [kbnClient.spaces.delete(OTHER_SPACE_ID)] : []),
        ]);
        for (const result of resourceResults) {
          if (result.status === 'rejected') {
            cleanupErrors.push(result.reason);
          }
        }
      } finally {
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
      }

      if (cleanupErrors.length > 0) {
        throw cleanupErrors.length === 1
          ? cleanupErrors[0]
          : new AggregateError(cleanupErrors, 'Session memory _remember teardown failed');
      }
    });

    apiTest('enforces contextEngine:write per space', async ({ apiClient }) => {
      const body = {
        session_id: DENIED_SESSION_ID,
        content: 'caller lacks write privilege',
      };

      await apiTest.step('rejects a read-only caller in the non-default space', async () => {
        const response = await apiClient.post(
          spacePath(OTHER_SPACE_ID, SESSION_MEMORY_REMEMBER_PATH),
          {
            headers: { ...readOnlyCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body,
          }
        );

        expect(response).toHaveStatusCode(403);
      });

      await apiTest.step(
        'rejects a caller whose write privilege is scoped to another space',
        async () => {
          const response = await apiClient.post(SESSION_MEMORY_REMEMBER_PATH, {
            headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body,
          });

          expect(response).toHaveStatusCode(403);
        }
      );
    });

    apiTest(
      'accepts a memory for the caller in the non-default space without manage_memory',
      async ({ apiClient }) => {
        const headers = { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS };
        const path = spacePath(OTHER_SPACE_ID, SESSION_MEMORY_REMEMBER_PATH);

        await apiTest.step('generates an id when omitted', async () => {
          const response = await apiClient.post(path, {
            headers,
            responseType: 'json',
            body: {
              session_id: OWN_SESSION_ID,
              ai_index_ids: [WRITABLE_AI_INDEX_ID],
              content: 'root cause was a connection pool limit',
            },
          });

          expect(response).toHaveStatusCode(202);
          const body = response.body as { id?: unknown };
          expect(Object.keys(body)).toStrictEqual(['id']);
          expect(body.id).toMatch(UUID_PATTERN);
        });

        await apiTest.step('accepts revising an existing active memory id', async () => {
          const response = await apiClient.post(path, {
            headers,
            responseType: 'json',
            body: {
              id: SEEDED_REVISABLE_MEMORY_ID,
              session_id: OWN_SESSION_ID,
              ai_index_ids: [WRITABLE_AI_INDEX_ID],
              content: 'revised root cause after follow-up investigation',
            },
          });

          expect(response).toHaveStatusCode(202);
          expect(response.body).toStrictEqual({ id: SEEDED_REVISABLE_MEMORY_ID });
        });

        await apiTest.step('returns 404 when revising a forgotten memory id', async () => {
          const forgetResponse = await apiClient.post(
            spacePath(OTHER_SPACE_ID, SESSION_MEMORY_FORGET_PATH),
            {
              headers,
              responseType: 'json',
              body: { ids: [SEEDED_FORGOTTEN_MEMORY_ID] },
            }
          );
          expect(forgetResponse).toHaveStatusCode(200);
          expect(forgetResponse.body).toStrictEqual({
            results: [{ id: SEEDED_FORGOTTEN_MEMORY_ID, outcome: 'forgotten' }],
          });

          await seedEsClient.indices.refresh({ index: SESSION_MEMORY_DATA_STREAM });

          const response = await apiClient.post(path, {
            headers,
            responseType: 'json',
            body: {
              id: SEEDED_FORGOTTEN_MEMORY_ID,
              session_id: OWN_SESSION_ID,
              ai_index_ids: [WRITABLE_AI_INDEX_ID],
              content: 'attempting to revise a forgotten memory',
            },
          });

          expect(response).toHaveStatusCode(404);
          expect(response.body).toMatchObject({
            message: expect.stringContaining(SEEDED_FORGOTTEN_MEMORY_ID),
          });
        });

        await apiTest.step('returns 404 when revising an unknown memory id', async () => {
          const unknownId = `mem-missing-${RUN_ID}`;
          const response = await apiClient.post(path, {
            headers,
            responseType: 'json',
            body: {
              id: unknownId,
              session_id: OWN_SESSION_ID,
              ai_index_ids: [WRITABLE_AI_INDEX_ID],
              content: 'mitigated by raising max_connections',
            },
          });

          expect(response).toHaveStatusCode(404);
          expect(response.body).toMatchObject({
            message: expect.stringContaining(unknownId),
          });
        });
      }
    );

    apiTest(
      'resolves contextEngine:manage_memory in the request space when targeting another user',
      async ({ apiClient }) => {
        const path = spacePath(OTHER_SPACE_ID, SESSION_MEMORY_REMEMBER_PATH);
        const otherUserBody = {
          session_id: MANAGED_SESSION_ID,
          user_id: TARGET_USER_ID,
          ai_index_ids: [WRITABLE_AI_INDEX_ID],
          content: 'memory written on behalf of another user',
        };

        await apiTest.step('rejects when manage_memory is missing', async () => {
          const response = await apiClient.post(path, {
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
            const response = await apiClient.post(path, {
              headers: { ...defaultSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: otherUserBody,
            });

            expect(response).toHaveStatusCode(403);
            expect(response.body).toMatchObject({
              message: expect.stringContaining('contextEngine:manage_memory'),
            });
          }
        );

        await apiTest.step(
          'accepts when manage_memory is granted in the request space',
          async () => {
            const response = await apiClient.post(path, {
              headers: { ...otherSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: otherUserBody,
            });

            expect(response).toHaveStatusCode(202);
            const body = response.body as { id?: unknown };
            expect(Object.keys(body)).toStrictEqual(['id']);
            expect(body.id).toMatch(UUID_PATTERN);
          }
        );
      }
    );

    apiTest(
      'checks AI index existence and Elasticsearch write privileges in the request space',
      async ({ apiClient }) => {
        const headers = { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS };
        const path = spacePath(OTHER_SPACE_ID, SESSION_MEMORY_REMEMBER_PATH);

        await apiTest.step(
          'returns 403 when the caller lacks write on the backing index',
          async () => {
            const response = await apiClient.post(path, {
              headers,
              responseType: 'json',
              body: {
                session_id: FORBIDDEN_INDEX_SESSION_ID,
                ai_index_ids: [FORBIDDEN_AI_INDEX_ID],
                content: 'targeting forbidden AI index',
              },
            });

            expect(response).toHaveStatusCode(403);
            expect(response.body).toMatchObject({
              message: expect.stringContaining(FORBIDDEN_AI_INDEX_ID),
            });
          }
        );

        await apiTest.step(
          'returns 404 when the AI index is only registered in another space',
          async () => {
            const response = await apiClient.post(path, {
              headers,
              responseType: 'json',
              body: {
                session_id: MISSING_INDEX_SESSION_ID,
                ai_index_ids: [DEFAULT_SPACE_AI_INDEX_ID],
                content: 'targeting AI index in another space',
              },
            });

            expect(response).toHaveStatusCode(404);
            expect(response.body).toMatchObject({
              message: expect.stringContaining(DEFAULT_SPACE_AI_INDEX_ID),
            });
          }
        );
      }
    );
  }
);
