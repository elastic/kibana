/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const COLLECTION = 'api/context_engine/ai_index';
const MANAGED_ID = 'elastic';
const aiIndexPath = (id: string) => `${COLLECTION}/${id}`;

const DEST = {
  dataStream: 'ai-index-ds-scout-test',
  index: 'ai-index-idx-scout-test',
  last: 'ai-index-ds-scout-last-dest',
  shared: 'ai-index-ds-scout-shared-dest',
};

const AI_INDEX = {
  lifecycle: 'scout_test_ai_index',
  index: 'scout_test_index_ai_index',
  lazy: 'scout_test_ai_index_lazy',
  last: 'scout_last_dest_ai_index',
  sharedA: 'scout_shared_dest_a',
  sharedB: 'scout_shared_dest_b',
  pattern: 'scout_pattern_dest_ai_index',
};

const DATA_STREAMS = [DEST.dataStream, DEST.last, DEST.shared];

const API_HEADERS = {
  ...testData.COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

const dataStreamDest = (value: string) => ({ type: 'data_stream', value });

const aiIndexBody = {
  description: 'AI index created by the Scout API test suite',
  dest: dataStreamDest(DEST.dataStream),
  automations: [{ type: 'workflow', value: 'scout-automation' }],
  sources: [{ type: 'esql', value: `FROM ${DEST.dataStream} | LIMIT 1` }],
};

const emptyAiIndex = (destValue: string) => ({
  dest: dataStreamDest(destValue),
  automations: [],
  sources: [],
});

apiTest.describe('context engine AI indices API', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let viewerApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
    for (const name of DATA_STREAMS) {
      await esClient.indices.createDataStream({ name }, { ignore: [400] });
    }
    await esClient.indices.create({ index: DEST.index }, { ignore: [400] });
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    // AI index deletes tolerate records that were never created (404).
    for (const id of Object.values(AI_INDEX)) {
      await apiClient.delete(aiIndexPath(id), {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    }
    await esClient.indices.delete({ index: DEST.index }, { ignore: [404] });
    for (const name of DATA_STREAMS) {
      await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
    }
  });

  apiTest('manages an AI index through its full lifecycle', async ({ apiClient }) => {
    let dateCreated: string;
    const path = aiIndexPath(AI_INDEX.lifecycle);

    await apiTest.step('creates the AI index', async () => {
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id: AI_INDEX.lifecycle, ...aiIndexBody },
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body).toStrictEqual({ status: 'created' });
    });

    await apiTest.step('rejects a duplicate id with a 409', async () => {
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id: AI_INDEX.lifecycle, ...aiIndexBody },
      });

      expect(response).toHaveStatusCode(409);
    });

    await apiTest.step('gets the AI index by id', async () => {
      const response = await apiClient.get(path, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: AI_INDEX.lifecycle, ...aiIndexBody });
      expect(response.body.date_created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.body.date_modified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      dateCreated = response.body.date_created;
    });

    await apiTest.step('lists the AI index', async () => {
      const response = await apiClient.get(COLLECTION, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.ai_indices).toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ id: AI_INDEX.lifecycle })])
      );
    });

    await apiTest.step('updates the AI index and preserves date_created', async () => {
      const response = await apiClient.put(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { ...aiIndexBody, description: 'Updated description' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ status: 'updated' });

      const updatedResponse = await apiClient.get(path, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(updatedResponse.body.description).toBe('Updated description');
      expect(updatedResponse.body.date_created).toBe(dateCreated);
    });

    await apiTest.step('deletes the AI index', async () => {
      const response = await apiClient.delete(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ acknowledged: true, errors: [] });
    });

    await apiTest.step('returns 404 once deleted', async () => {
      const getResponse = await apiClient.get(path, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(404);

      const deleteResponse = await apiClient.delete(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(deleteResponse).toHaveStatusCode(404);
    });
  });

  apiTest(
    'creates an AI index whose dest does not exist yet (lazy creation)',
    async ({ apiClient }) => {
      const response = await apiClient.put(aiIndexPath(AI_INDEX.lazy), {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: {
          ...aiIndexBody,
          dest: dataStreamDest('ai-index-ds-does-not-exist*'),
        },
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body).toStrictEqual({ status: 'created' });
    }
  );

  apiTest('creates and reads an index AI index', async ({ apiClient }) => {
    const dest = { type: 'index', value: `${DEST.index}*` };
    const path = aiIndexPath(AI_INDEX.index);

    const createResponse = await apiClient.put(path, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { dest, automations: [], sources: [] },
    });
    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body).toStrictEqual({ status: 'created' });

    const getResponse = await apiClient.get(path, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body).toMatchObject({ id: AI_INDEX.index, dest });
  });

  apiTest('rejects a system index as an index dest', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { ...aiIndexBody, dest: { type: 'index', value: '.kibana*' } },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects a request without the required dest field', async ({ apiClient }) => {
    const { dest, ...bodyWithoutDest } = aiIndexBody;

    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: bodyWithoutDest,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects an id with disallowed characters', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath('Invalid_ID'), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: aiIndexBody,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('forbids writes for a read-only user', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: aiIndexBody,
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest('allows reads for a read-only user', async ({ apiClient }) => {
    const response = await apiClient.get(COLLECTION, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('rejects delete of a managed AI index with 409', async ({ apiClient }) => {
    const path = aiIndexPath(MANAGED_ID);
    const getBefore = await apiClient.get(path, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(getBefore).toHaveStatusCode(200);
    expect(getBefore.body.managed).toBe(true);

    const deleteResponse = await apiClient.delete(
      `${path}?delete_knowledge_indicators=true&delete_automations=true`,
      {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      }
    );

    expect(deleteResponse).toHaveStatusCode(409);
    expect(deleteResponse.body.message).toStrictEqual(expect.stringContaining('managed'));

    const getAfter = await apiClient.get(path, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(getAfter).toHaveStatusCode(200);
    expect(getAfter.body.managed).toBe(true);
  });

  apiTest(
    'deletes the dest when it is the last AI index using it',
    async ({ apiClient, esClient }) => {
      await esClient.indices.createDataStream({ name: DEST.last }, { ignore: [400] });
      const createResponse = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id: AI_INDEX.last, ...emptyAiIndex(DEST.last) },
      });
      expect(createResponse).toHaveStatusCode(201);
      expect(await esClient.indices.exists({ index: DEST.last })).toBe(true);

      const deleteResponse = await apiClient.delete(
        `${aiIndexPath(AI_INDEX.last)}?delete_knowledge_indicators=true`,
        {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        }
      );

      expect(deleteResponse).toHaveStatusCode(200);
      expect(deleteResponse.body).toStrictEqual({ acknowledged: true, errors: [] });
      expect(await esClient.indices.exists({ index: DEST.last })).toBe(false);
    }
  );

  apiTest(
    'skips dest delete while another AI index still uses it',
    async ({ apiClient, esClient }) => {
      await apiTest.step('creates two AI indices that share a dest', async () => {
        await esClient.indices.createDataStream({ name: DEST.shared }, { ignore: [400] });
        for (const id of [AI_INDEX.sharedA, AI_INDEX.sharedB]) {
          const response = await apiClient.post(COLLECTION, {
            headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body: { id, ...emptyAiIndex(DEST.shared) },
          });
          expect(response).toHaveStatusCode(201);
        }
      });

      await apiTest.step('keeps the dest when the first AI index is deleted', async () => {
        const response = await apiClient.delete(
          `${aiIndexPath(AI_INDEX.sharedA)}?delete_knowledge_indicators=true`,
          {
            headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.acknowledged).toBe(true);
        expect(response.body.errors).toStrictEqual([expect.stringContaining(AI_INDEX.sharedB)]);
        expect(await esClient.indices.exists({ index: DEST.shared })).toBe(true);
      });

      await apiTest.step('deletes the dest when the last AI index is deleted', async () => {
        const response = await apiClient.delete(
          `${aiIndexPath(AI_INDEX.sharedB)}?delete_knowledge_indicators=true`,
          {
            headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ acknowledged: true, errors: [] });
        expect(await esClient.indices.exists({ index: DEST.shared })).toBe(false);
      });
    }
  );

  apiTest(
    'does not delete an index-pattern dest when deleting knowledge indicators',
    async ({ apiClient }) => {
      const path = aiIndexPath(AI_INDEX.pattern);
      const createResponse = await apiClient.put(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: emptyAiIndex('ai-index-ds-scout-pattern*'),
      });
      expect(createResponse).toHaveStatusCode(201);

      const deleteResponse = await apiClient.delete(`${path}?delete_knowledge_indicators=true`, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(deleteResponse).toHaveStatusCode(200);
      expect(deleteResponse.body).toStrictEqual({
        acknowledged: true,
        errors: [expect.stringContaining('index pattern')],
      });
    }
  );
});
