/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const AI_INDEX_ID = 'scout_memory_public_api';
const DEST = 'ai-index-idx-scout-memory-public-api';
const AI_INDEX_PATH = `${testData.AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}`;
const MEMORIES_PATH = `${AI_INDEX_PATH}/memories`;

apiTest.describe('context engine memories API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  let previousMemoryEnabled: boolean | undefined;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
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
    await apiClient.delete(AI_INDEX_PATH, {
      headers,
      responseType: 'json',
    });
    await esClient.indices.delete({ index: DEST }, { ignore: [404] });
    await esClient.indices.create({ index: DEST }, { ignore: [400] });
    const response = await apiClient.put(AI_INDEX_PATH, {
      headers: { ...credentials.apiKeyHeader, ...testData.API_HEADERS },
      responseType: 'json',
      body: {
        dest: { type: 'index', value: DEST },
        memory_enabled: true,
        automations: [],
        sources: [],
        traces: [],
      },
    });
    expect(response).toHaveStatusCode(201);
  });

  apiTest.afterAll(async ({ apiClient, esClient, kbnClient }) => {
    const headers = { ...credentials.apiKeyHeader, ...testData.API_HEADERS };
    await apiClient.delete(AI_INDEX_PATH, {
      headers,
      responseType: 'json',
    });
    await esClient.indices.delete({ index: DEST }, { ignore: [404] });
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
    const reviseResponse = await apiClient.put(itemPath, {
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
});
