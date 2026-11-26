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
import { apiTest, registerAiIndex, spaceScoped, testData } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, API_HEADERS, RECALL_PATH } = testData;

const GLOBAL_SETTINGS_PATH = '/internal/kibana/global_settings';

interface GlobalUiSettingsResponse {
  settings?: Record<string, { userValue?: boolean }>;
}

const RUN_ID = randomUUID().slice(0, 8);
const OTHER_SPACE_ID = `ce-recall-other-${RUN_ID}`;
const READABLE_INDEX = `ai-index-idx-scout-recall-readable-${RUN_ID}`;
const FORBIDDEN_INDEX = `ai-index-idx-scout-recall-forbidden-${RUN_ID}`;
const READABLE_AI_INDEX_ID = `scout-recall-readable-${RUN_ID}`;
const FORBIDDEN_AI_INDEX_ID = `scout-recall-forbidden-${RUN_ID}`;
const DEFAULT_SPACE_AI_INDEX_ID = `scout-recall-default-space-${RUN_ID}`;
const TARGET_USER_ID = `scout-recall-other-user-${RUN_ID}`;
const QUERY_TOKEN = `recalltoken${RUN_ID}`;

const KI_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    id: { type: 'keyword' },
    content: { type: 'text' },
    updated_at: { type: 'date' },
    expires_at: { type: 'date' },
    user_id: { type: 'keyword' },
    attributes: { type: 'object' },
    governance: {
      properties: { lifecycle: { properties: { status: { type: 'keyword' } } } },
    },
    permissions: {
      properties: {
        kibana: {
          properties: {
            privileges: { type: 'nested', properties: { space: { type: 'keyword' } } },
          },
        },
      },
    },
  },
} as const;

const spacePath = (spaceId: string, path: string) => `s/${spaceId}/${path}`;

const expectJsonRecall = (body: { results?: unknown; took_ms?: unknown }, results: unknown[]) => {
  expect(Object.keys(body)).toStrictEqual(['results', 'took_ms']);
  expect(body.results).toStrictEqual(results);
  expect(typeof body.took_ms).toBe('number');
};

const READABLE_INDEX_READ = {
  cluster: [],
  indices: [{ names: [READABLE_INDEX], privileges: ['read'] }],
};

const OTHER_SPACE_READ_ROLE: KibanaRole = {
  elasticsearch: READABLE_INDEX_READ,
  kibana: [{ base: [], feature: { contextEngine: ['read'] }, spaces: [OTHER_SPACE_ID] }],
};

const DEFAULT_SPACE_MANAGE_MEMORY_ROLE: KibanaRole = {
  elasticsearch: READABLE_INDEX_READ,
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['read', 'manage_memory'] },
      spaces: [DEFAULT_SPACE_ID],
    },
    { base: [], feature: { contextEngine: ['read'] }, spaces: [OTHER_SPACE_ID] },
  ],
};

const OTHER_SPACE_MANAGE_MEMORY_ROLE: KibanaRole = {
  elasticsearch: READABLE_INDEX_READ,
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['read', 'manage_memory'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

apiTest.describe('context engine recall API', { tag: tags.stateful.classic }, () => {
  let initialMemorySetting: { value: boolean | undefined } | undefined;
  let spaceCreated = false;
  let callerProfileUid: string;
  let adminCredentials: RoleApiCredentials;
  let otherSpaceReadCredentials: RoleApiCredentials;
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

    await kbnClient.spaces.create({ id: OTHER_SPACE_ID, name: 'CE recall other space' });
    spaceCreated = true;

    await esClient.indices.create({ index: READABLE_INDEX, mappings: KI_MAPPINGS });
    await esClient.indices.create({ index: FORBIDDEN_INDEX, mappings: KI_MAPPINGS });

    adminCredentials = await requestAuth.getApiKey('admin');
    otherSpaceReadCredentials = await requestAuth.getApiKeyForCustomRole(OTHER_SPACE_READ_ROLE);
    defaultSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
      DEFAULT_SPACE_MANAGE_MEMORY_ROLE
    );
    otherSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
      OTHER_SPACE_MANAGE_MEMORY_ROLE
    );

    const { api_keys: apiKeys } = await esClient.security.getApiKey({
      id: otherSpaceReadCredentials.apiKey.id,
      with_profile_uid: true,
    });
    const profileUid = apiKeys[0]?.profile_uid;
    if (!profileUid) {
      throw new Error('Expected the recall caller API key to have a user profile');
    }
    callerProfileUid = profileUid;

    const readableDocs = [
      {
        id: 'own-active',
        content: `Checkout pool limit ${QUERY_TOKEN}`,
        updated_at: '2026-11-16T10:00:00.000Z',
        user_id: callerProfileUid,
        attributes: { service: 'checkout' },
        ...spaceScoped(OTHER_SPACE_ID),
      },
      {
        id: 'target-user-active',
        content: `Target user note ${QUERY_TOKEN}`,
        updated_at: '2026-11-16T11:00:00.000Z',
        user_id: TARGET_USER_ID,
        attributes: { owner: 'target' },
        ...spaceScoped(OTHER_SPACE_ID),
      },
      {
        id: 'default-space-only',
        content: `Default space note ${QUERY_TOKEN}`,
        updated_at: '2026-11-16T10:00:00.000Z',
        ...spaceScoped(DEFAULT_SPACE_ID),
      },
      {
        id: 'deleted-ki',
        content: `Deleted note ${QUERY_TOKEN}`,
        updated_at: '2026-11-16T10:00:00.000Z',
        governance: { lifecycle: { status: 'deleted' } },
        ...spaceScoped(OTHER_SPACE_ID),
      },
      {
        id: 'expired-ki',
        content: `Expired note ${QUERY_TOKEN}`,
        updated_at: '2026-11-16T10:00:00.000Z',
        expires_at: '2000-01-01T00:00:00.000Z',
        ...spaceScoped(OTHER_SPACE_ID),
      },
    ];
    const forbiddenDoc = {
      id: 'forbidden-ki',
      content: `Forbidden secret ${QUERY_TOKEN}`,
      updated_at: '2026-11-16T10:00:00.000Z',
      ...spaceScoped(OTHER_SPACE_ID),
    };
    const bulkResult = await esClient.bulk({
      refresh: true,
      operations: [
        ...readableDocs.flatMap((doc) => [{ index: { _index: READABLE_INDEX, _id: doc.id } }, doc]),
        { index: { _index: FORBIDDEN_INDEX, _id: forbiddenDoc.id } },
        forbiddenDoc,
      ],
    });
    expect(bulkResult.errors).toBe(false);

    const adminHeaders = { ...adminCredentials.apiKeyHeader, ...API_HEADERS };
    for (const [path, id, index] of [
      [spacePath(OTHER_SPACE_ID, AI_INDEX_COLLECTION_PATH), READABLE_AI_INDEX_ID, READABLE_INDEX],
      [spacePath(OTHER_SPACE_ID, AI_INDEX_COLLECTION_PATH), FORBIDDEN_AI_INDEX_ID, FORBIDDEN_INDEX],
      [AI_INDEX_COLLECTION_PATH, DEFAULT_SPACE_AI_INDEX_ID, READABLE_INDEX],
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
      if (adminCredentials) {
        const adminHeaders = { ...adminCredentials.apiKeyHeader, ...API_HEADERS };
        const aiIndexResults = await Promise.allSettled([
          ...[READABLE_AI_INDEX_ID, FORBIDDEN_AI_INDEX_ID].map((id) =>
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
        esClient.indices.delete({ index: [READABLE_INDEX, FORBIDDEN_INDEX] }, { ignore: [404] }),
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
        : new AggregateError(cleanupErrors, 'Recall teardown failed');
    }
  });

  apiTest('enforces contextEngine:read per space', async ({ apiClient }) => {
    const response = await apiClient.post(RECALL_PATH, {
      headers: { ...otherSpaceReadCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { query: QUERY_TOKEN, user_id: callerProfileUid, include: ['ai_index:*'] },
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest(
    'recalls active space- and user-scoped AI index results in JSON and YAML formats',
    async ({ apiClient }) => {
      const headers = { ...otherSpaceReadCredentials.apiKeyHeader, ...API_HEADERS };
      const path = spacePath(OTHER_SPACE_ID, RECALL_PATH);

      await apiTest.step('returns the matching result as JSON', async () => {
        const response = await apiClient.post(path, {
          headers,
          responseType: 'json',
          body: {
            query: QUERY_TOKEN,
            user_id: callerProfileUid,
            include: ['ai_index:*'],
            format: 'json',
          },
        });

        expect(response).toHaveStatusCode(200);
        expectJsonRecall(response.body, [
          {
            id: 'own-active',
            source: `ai_index:${READABLE_AI_INDEX_ID}`,
            date: '2026-11-16T10:00:00.000Z',
            content: `Checkout pool limit ${QUERY_TOKEN}`,
            attributes: { service: 'checkout' },
          },
        ]);
      });

      await apiTest.step('returns the matching result as YAML by default', async () => {
        const response = await apiClient.post(path, {
          headers,
          responseType: 'json',
          body: { query: QUERY_TOKEN, user_id: callerProfileUid, include: ['ai_index:*'] },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as { context?: unknown };
        expect(Object.keys(body)).toStrictEqual(['context', 'took_ms']);
        const { context } = body;
        expect(typeof context).toBe('string');
        expect(context).toContain(`source: ai_index:${READABLE_AI_INDEX_ID}`);
        expect(context).toContain(`Checkout pool limit ${QUERY_TOKEN}`);
        for (const excludedId of [
          'default-space-only',
          'deleted-ki',
          'expired-ki',
          'target-user-active',
          'forbidden-ki',
        ]) {
          expect(context).not.toContain(excludedId);
        }
      });

      await apiTest.step('returns no results for an unreadable AI index', async () => {
        const response = await apiClient.post(path, {
          headers,
          responseType: 'json',
          body: {
            query: QUERY_TOKEN,
            user_id: callerProfileUid,
            include: [`ai_index:${FORBIDDEN_AI_INDEX_ID}`],
            format: 'json',
          },
        });

        expect(response).toHaveStatusCode(200);
        expectJsonRecall(response.body, []);
      });
    }
  );

  apiTest(
    'resolves contextEngine:manage_memory in the request space when targeting another user',
    async ({ apiClient }) => {
      const path = spacePath(OTHER_SPACE_ID, RECALL_PATH);
      const otherUserBody = {
        query: QUERY_TOKEN,
        user_id: TARGET_USER_ID,
        include: [`ai_index:${READABLE_AI_INDEX_ID}`],
        format: 'json',
      };

      await apiTest.step('rejects when manage_memory is missing', async () => {
        const response = await apiClient.post(path, {
          headers: { ...otherSpaceReadCredentials.apiKeyHeader, ...API_HEADERS },
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
        "recalls the target user's results when manage_memory is granted in the request space",
        async () => {
          const response = await apiClient.post(path, {
            headers: { ...otherSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body: otherUserBody,
          });

          expect(response).toHaveStatusCode(200);
          expectJsonRecall(response.body, [
            {
              id: 'target-user-active',
              source: `ai_index:${READABLE_AI_INDEX_ID}`,
              date: '2026-11-16T11:00:00.000Z',
              content: `Target user note ${QUERY_TOKEN}`,
              attributes: { owner: 'target' },
            },
          ]);
        }
      );
    }
  );

  apiTest(
    'gates session stores on contextEngine:memoryEnabled while keeping AI index recall available',
    async ({ apiClient, kbnClient }) => {
      const headers = { ...otherSpaceReadCredentials.apiKeyHeader, ...API_HEADERS };
      const path = spacePath(OTHER_SPACE_ID, RECALL_PATH);
      const recall = (include: string[]) =>
        apiClient.post(path, {
          headers,
          responseType: 'json',
          body: { query: QUERY_TOKEN, user_id: callerProfileUid, include, format: 'json' },
        });

      await apiTest.step('returns 404 for session stores while memory is off', async () => {
        await kbnClient.uiSettings.updateGlobal({
          [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: false,
        });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        expect(await recall(['session_events'])).toHaveStatusCode(404);
        expect(await recall(['session_memory'])).toHaveStatusCode(404);

        const response = await recall([`ai_index:${READABLE_AI_INDEX_ID}`]);
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ results: [{ id: 'own-active' }] });
      });

      await apiTest.step('queries session stores and AI indices while memory is on', async () => {
        await kbnClient.uiSettings.updateGlobal({
          [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
        });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        const response = await recall([
          'session_events',
          'session_memory',
          `ai_index:${READABLE_AI_INDEX_ID}`,
        ]);
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ results: [{ id: 'own-active' }] });
      });
    }
  );

  apiTest('validates request body parameters', async ({ apiClient }) => {
    const headers = { ...otherSpaceReadCredentials.apiKeyHeader, ...API_HEADERS };
    const path = spacePath(OTHER_SPACE_ID, RECALL_PATH);
    const validBody = { query: QUERY_TOKEN, user_id: callerProfileUid, include: ['ai_index:*'] };

    await apiTest.step('rejects an empty include', async () => {
      const response = await apiClient.post(path, {
        headers,
        responseType: 'json',
        body: { ...validBody, include: [] },
      });

      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects an unknown include entry', async () => {
      const response = await apiClient.post(path, {
        headers,
        responseType: 'json',
        body: { ...validBody, include: ['unknown_store'] },
      });

      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects an out-of-range token_budget', async () => {
      const response = await apiClient.post(path, {
        headers,
        responseType: 'json',
        body: { ...validBody, token_budget: 500 },
      });

      expect(response).toHaveStatusCode(400);
    });
  });
});
