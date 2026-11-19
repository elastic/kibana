/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, API_HEADERS, CONTEXT_ENGINE_READ } = testData;
// Unique per run so a retried `beforeAll` does not 409 on fixed names.
const RUN_ID = randomUUID().slice(0, 8);
const OTHER_SPACE_ID = `ce-list-other-${RUN_ID}`;
const MANAGED_ID = 'elastic';
const READABLE_PREFIX = `ai-index-idx-scout-list-${RUN_ID}-`;
const READABLE_INDEX = `${READABLE_PREFIX}readable`;
const EMPTY_INDEX = `${READABLE_PREFIX}empty`;
const MISSING_INDEX = `${READABLE_PREFIX}missing`;
// Outside the role's index pattern: probe gets 403, entry must be dropped.
const FORBIDDEN_INDEX = `ai-index-idx-scout-list-forbidden-${RUN_ID}`;

const DEFAULT_SPACE_IDS = {
  readable: `scout-list-readable-${RUN_ID}`,
  empty: `scout-list-empty-${RUN_ID}`,
  missing: `scout-list-missing-${RUN_ID}`,
  forbidden: `scout-list-forbidden-${RUN_ID}`,
};
// Registered only in `OTHER_SPACE_ID`, on a backing index the caller can read.
const OTHER_SPACE_ID_ONLY = `scout-list-other-only-${RUN_ID}`;

/** Documented caller: `contextEngine:read` plus ES `read` on (most of) the backing indices. */
const LIST_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [`${READABLE_PREFIX}*`], privileges: ['read'] }],
  },
  kibana: [CONTEXT_ENGINE_READ],
};

const registerAiIndex = (id: string, index: string) => ({
  id,
  description: `Scout list fixture ${id}`,
  dest: { type: 'index', value: index },
  automations: [],
  sources: [],
});

const otherSpacePath = (path: string) => `s/${OTHER_SPACE_ID}/${path}`;

const allIds = (body: { ai_indices: Array<{ id: string }> }): string[] =>
  body.ai_indices.map(({ id }) => id);
const listedIds = (body: { ai_indices: Array<{ id: string }> }): string[] =>
  allIds(body).filter((id) => id.endsWith(RUN_ID));

// The `agent_builder` Scout config set pins `contextEngine:enabled=true` through `uiSettings.overrides`,
// which is read-only and applies to every space, so the tests never toggle it.
apiTest.describe('context engine AI Index list', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let listCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient, apiClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    listCredentials = await requestAuth.getApiKeyForCustomRole(LIST_ROLE);

    await kbnClient.spaces.create({ id: OTHER_SPACE_ID, name: 'CE list other space' });

    await esClient.indices.create({ index: READABLE_INDEX });
    await esClient.indices.create({ index: EMPTY_INDEX });
    await esClient.indices.create({ index: FORBIDDEN_INDEX });
    await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { index: { _index: READABLE_INDEX, _id: 'plain' } },
        { title: 'Readable by the list role' },
        { index: { _index: FORBIDDEN_INDEX, _id: 'plain' } },
        { title: 'Readable by admins only' },
      ],
    });

    const register = async (path: string, body: ReturnType<typeof registerAiIndex>) => {
      const response = await apiClient.post(path, {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body,
      });
      expect(response).toHaveStatusCode(201);
    };
    for (const body of [
      registerAiIndex(DEFAULT_SPACE_IDS.readable, READABLE_INDEX),
      registerAiIndex(DEFAULT_SPACE_IDS.empty, EMPTY_INDEX),
      registerAiIndex(DEFAULT_SPACE_IDS.missing, MISSING_INDEX),
      registerAiIndex(DEFAULT_SPACE_IDS.forbidden, FORBIDDEN_INDEX),
    ]) {
      await register(AI_INDEX_COLLECTION_PATH, body);
    }
    await register(
      otherSpacePath(AI_INDEX_COLLECTION_PATH),
      registerAiIndex(OTHER_SPACE_ID_ONLY, READABLE_INDEX)
    );
  });

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    const remove = (path: string) =>
      apiClient.delete(path, {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    for (const id of Object.values(DEFAULT_SPACE_IDS)) {
      await remove(`${AI_INDEX_COLLECTION_PATH}/${id}`);
    }
    await remove(otherSpacePath(`${AI_INDEX_COLLECTION_PATH}/${OTHER_SPACE_ID_ONLY}`));
    await esClient.indices.delete(
      { index: [READABLE_INDEX, EMPTY_INDEX, FORBIDDEN_INDEX] },
      { ignore: [404] }
    );
    await kbnClient.spaces.delete(OTHER_SPACE_ID);
  });

  apiTest('lists the entries registered here that the caller can read', async ({ apiClient }) => {
    const response = await apiClient.get(AI_INDEX_COLLECTION_PATH, {
      headers: { ...listCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    // Empty and missing stay listed; unreadable is dropped. The other space's entry never shows up here.
    expect(listedIds(response.body).sort()).toStrictEqual(
      [DEFAULT_SPACE_IDS.readable, DEFAULT_SPACE_IDS.empty, DEFAULT_SPACE_IDS.missing].sort()
    );
  });

  apiTest('lists only the entries registered in the request space', async ({ apiClient }) => {
    const response = await apiClient.get(otherSpacePath(AI_INDEX_COLLECTION_PATH), {
      headers: { ...listCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(listedIds(response.body)).toStrictEqual([OTHER_SPACE_ID_ONLY]);
  });

  apiTest('lists an entry once its backing index becomes readable', async ({ apiClient }) => {
    const response = await apiClient.get(AI_INDEX_COLLECTION_PATH, {
      headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(listedIds(response.body)).toContain(DEFAULT_SPACE_IDS.forbidden);
  });

  apiTest(
    'bootstraps the managed entry in the request space on first list',
    async ({ apiClient }) => {
      const response = await apiClient.get(otherSpacePath(AI_INDEX_COLLECTION_PATH), {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(allIds(response.body)).toContain(MANAGED_ID);
    }
  );

  apiTest('still returns a dropped entry by id', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${AI_INDEX_COLLECTION_PATH}/${DEFAULT_SPACE_IDS.forbidden}`,
      {
        headers: { ...listCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(DEFAULT_SPACE_IDS.forbidden);
  });
});
