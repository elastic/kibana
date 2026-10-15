/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const AI_INDEX_ID = 'scout_memory_public_api';
const DEST = 'ai-index-idx-scout-memory-public-api';
const DATA_STREAM_AI_INDEX_ID = 'scout_memory_public_api_data_stream';
const DATA_STREAM_DEST = 'ai-index-ds-scout-memory-public-api';
const OTHER_SPACE = 'scout-memory-public-api-other';
const AI_INDEX_PATH = `${testData.AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}`;
const MEMORIES_PATH = `${AI_INDEX_PATH}/memories`;
const DATA_STREAM_AI_INDEX_PATH = `${testData.AI_INDEX_COLLECTION_PATH}/${DATA_STREAM_AI_INDEX_ID}`;
const DATA_STREAM_MEMORIES_PATH = `${DATA_STREAM_AI_INDEX_PATH}/memories`;
const inOtherSpace = (path: string) => `s/${OTHER_SPACE}/${path}`;
const AI_INDEX_BODY = {
  dest: { type: 'index', value: DEST },
  memory_enabled: true,
  automations: [],
  sources: [],
  traces: [],
};
const NO_DESTINATION_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { contextEngine: ['all'] }, spaces: ['*'] }],
};

apiTest.describe('context engine memories API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  let noDestinationWriteCredentials: RoleApiCredentials;
  let previousMemoryEnabled: boolean | undefined;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
    noDestinationWriteCredentials = await requestAuth.getApiKeyForCustomRole(
      NO_DESTINATION_WRITE_ROLE
    );
    const headers = { ...credentials.apiKeyHeader, ...testData.API_HEADERS };
    const globalSettingsResponse = await apiClient.get('/internal/kibana/global_settings', {
      headers,
      responseType: 'json',
    });
    expect(globalSettingsResponse).toHaveStatusCode(200);
    previousMemoryEnabled =
      globalSettingsResponse.body.settings?.[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]?.userValue;
    await kbnClient.uiSettings.updateGlobal({
      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
    });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();
    await kbnClient.spaces.create({ id: OTHER_SPACE, name: 'Memory API other space' });
    await apiClient.delete(AI_INDEX_PATH, {
      headers,
      responseType: 'json',
    });
    await esClient.indices.delete({ index: DEST }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DATA_STREAM_DEST }, { ignore: [404] });
    await esClient.indices.create({ index: DEST }, { ignore: [400] });
    for (const path of [AI_INDEX_PATH, inOtherSpace(AI_INDEX_PATH)]) {
      const response = await apiClient.put(path, {
        headers,
        responseType: 'json',
        body: AI_INDEX_BODY,
      });
      expect(response).toHaveStatusCode(201);
    }
    await esClient.indices.createDataStream({ name: DATA_STREAM_DEST });
    const dataStreamResponse = await apiClient.put(DATA_STREAM_AI_INDEX_PATH, {
      headers,
      responseType: 'json',
      body: {
        ...AI_INDEX_BODY,
        dest: { type: 'data_stream', value: DATA_STREAM_DEST },
      },
    });
    expect(dataStreamResponse).toHaveStatusCode(201);
  });

  apiTest.afterAll(async ({ apiClient, esClient, kbnClient }) => {
    const headers = { ...credentials.apiKeyHeader, ...testData.API_HEADERS };
    await apiClient.delete(AI_INDEX_PATH, {
      headers,
      responseType: 'json',
    });
    await apiClient.delete(inOtherSpace(AI_INDEX_PATH), {
      headers,
      responseType: 'json',
    });
    await apiClient.delete(DATA_STREAM_AI_INDEX_PATH, {
      headers,
      responseType: 'json',
    });
    await esClient.indices.delete({ index: DEST }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DATA_STREAM_DEST }, { ignore: [404] });
    await kbnClient.spaces.delete(OTHER_SPACE);
    if (previousMemoryEnabled === undefined) {
      await apiClient.delete(
        `/internal/kibana/global_settings/${encodeURIComponent(
          CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID
        )}`,
        { headers, responseType: 'json' }
      );
    } else {
      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: previousMemoryEnabled,
      });
    }
    await kbnClient.uiSettings.waitForEventualCacheRefresh();
  });

  apiTest('creates, revises, and tombstones a memory', async ({ apiClient, esClient }) => {
    const headers = { ...credentials.apiKeyHeader, ...testData.API_HEADERS };
    const createResponse = await apiClient.post(MEMORIES_PATH, {
      headers,
      responseType: 'json',
      body: {
        type: 'memory.session_fact',
        title: 'Initial title',
        description: 'A fact found during the Scout run.',
        content: 'Initial content.',
      },
    });
    expect(createResponse).toHaveStatusCode(201);
    expect(Object.keys(createResponse.body).sort()).toStrictEqual(['id', 'session_id']);
    expect(typeof createResponse.body.id).toBe('string');
    expect(typeof createResponse.body.session_id).toBe('string');

    const { id, session_id: sessionId } = createResponse.body;
    const itemPath = `${MEMORIES_PATH}/${id}`;
    const reviseResponse = await apiClient.patch(itemPath, {
      headers,
      responseType: 'json',
      body: {
        type: 'memory.session_fact',
        title: 'Revised title',
        description: 'A revised fact found during the Scout run.',
        content: 'Revised content.',
        session_id: sessionId,
      },
    });
    expect(reviseResponse).toHaveStatusCode(200);
    expect(reviseResponse.body).toStrictEqual({ id, session_id: sessionId });

    const deleteResponse = await apiClient.delete(itemPath, {
      headers,
      responseType: 'json',
    });
    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body).toStrictEqual({ id });

    const reviseDeletedResponse = await apiClient.patch(itemPath, {
      headers,
      responseType: 'json',
      body: {
        type: 'memory.session_fact',
        title: 'Cannot revise deleted memory',
        description: 'The tombstone must remain current.',
        content: 'This revision must be rejected.',
        session_id: sessionId,
      },
    });
    expect(reviseDeletedResponse).toHaveStatusCode(409);

    const stored = await esClient.get({ index: DEST, id });
    expect(stored._source).toMatchObject({
      id,
      title: 'Revised title',
      governance: {
        provenance: {
          created_by: { uri: 'api://context_engine.ai_index.memories', metadata: {} },
          updated_by: { uri: 'api://context_engine.ai_index.memories', metadata: {} },
        },
        lifecycle: { status: 'deleted' },
      },
    });
  });

  apiTest(
    'enforces destination index privileges without leaking its name',
    async ({ apiClient }) => {
      const response = await apiClient.post(MEMORIES_PATH, {
        headers: {
          ...noDestinationWriteCredentials.apiKeyHeader,
          ...testData.API_HEADERS,
        },
        responseType: 'json',
        body: {
          type: 'memory.session_fact',
          title: 'Unauthorized memory',
          description: 'The caller cannot write to the destination.',
          content: 'This content must not be stored.',
        },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body).toMatchObject({ message: 'Elasticsearch denied the memory write.' });
      expect(JSON.stringify(response.body)).not.toContain(DEST);
    }
  );

  apiTest(
    'shares public memories but protects and preserves space-scoped memories',
    async ({ apiClient, esClient }) => {
      const headers = { ...credentials.apiKeyHeader, ...testData.API_HEADERS };
      const scopedId = 'space-scoped-memory';
      await esClient.index({
        index: DEST,
        id: scopedId,
        refresh: 'wait_for',
        document: {
          '@timestamp': '2026-10-14T00:00:00.000Z',
          updated_at: '2026-10-14T00:00:00.000Z',
          id: scopedId,
          type: 'memory.session_fact',
          title: 'Scoped memory',
          description: 'Visible only in the default space.',
          content: 'Scoped content.',
          permissions: { kibana: { privileges: [{ space: 'default' }] } },
        },
      });
      const revisionBody = {
        type: 'memory.session_fact',
        title: 'Revised scoped memory',
        description: 'Still visible only in the default space.',
        content: 'Revised scoped content.',
        session_id: 'scoped-session',
      };

      const hiddenResponse = await apiClient.patch(inOtherSpace(`${MEMORIES_PATH}/${scopedId}`), {
        headers,
        responseType: 'json',
        body: revisionBody,
      });
      expect(hiddenResponse).toHaveStatusCode(404);

      const visibleResponse = await apiClient.patch(`${MEMORIES_PATH}/${scopedId}`, {
        headers,
        responseType: 'json',
        body: revisionBody,
      });
      expect(visibleResponse).toHaveStatusCode(200);
      const storedScoped = await esClient.get({ index: DEST, id: scopedId });
      expect(storedScoped._source).toMatchObject({
        permissions: { kibana: { privileges: [{ space: 'default' }] } },
      });

      const publicCreate = await apiClient.post(MEMORIES_PATH, {
        headers,
        responseType: 'json',
        body: {
          type: 'memory.session_fact',
          title: 'Public memory',
          description: 'Visible through either registration.',
          content: 'Public content.',
        },
      });
      expect(publicCreate).toHaveStatusCode(201);
      const publicRevise = await apiClient.patch(
        inOtherSpace(`${MEMORIES_PATH}/${publicCreate.body.id}`),
        {
          headers,
          responseType: 'json',
          body: {
            type: 'memory.session_fact',
            title: 'Public memory revised elsewhere',
            description: 'Still visible through either registration.',
            content: 'Revised public content.',
            session_id: publicCreate.body.session_id,
          },
        }
      );
      expect(publicRevise).toHaveStatusCode(200);
    }
  );

  apiTest(
    'appends data-stream revisions with stable logical identity',
    async ({ apiClient, esClient }) => {
      const headers = { ...credentials.apiKeyHeader, ...testData.API_HEADERS };
      const createResponse = await apiClient.post(DATA_STREAM_MEMORIES_PATH, {
        headers,
        responseType: 'json',
        body: {
          type: 'memory.session_fact',
          title: 'Data-stream memory',
          description: 'Initial data-stream revision.',
          content: 'Initial content.',
        },
      });
      expect(createResponse).toHaveStatusCode(201);
      const { id, session_id: sessionId } = createResponse.body;
      const itemPath = `${DATA_STREAM_MEMORIES_PATH}/${id}`;

      const reviseResponse = await apiClient.patch(itemPath, {
        headers,
        responseType: 'json',
        body: {
          type: 'memory.session_fact',
          title: 'Revised data-stream memory',
          description: 'Second data-stream revision.',
          content: 'Revised content.',
          session_id: sessionId,
        },
      });
      expect(reviseResponse).toHaveStatusCode(200);
      const deleteResponse = await apiClient.delete(itemPath, {
        headers,
        responseType: 'json',
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const stored = await esClient.search<{
        id: string;
        governance?: { lifecycle?: { status?: string } };
      }>({
        index: DATA_STREAM_DEST,
        query: { term: { id } },
        sort: [{ '@timestamp': 'asc' }],
        size: 10,
      });
      expect(stored.hits.hits).toHaveLength(3);
      expect(new Set(stored.hits.hits.map((hit) => hit._source?.id))).toStrictEqual(new Set([id]));
      expect(new Set(stored.hits.hits.map((hit) => hit._id)).size).toBe(3);
      expect(stored.hits.hits[2]._source).toMatchObject({
        governance: { lifecycle: { status: 'deleted' } },
      });
    }
  );
});
