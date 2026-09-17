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
const AI_INDEX_ID = 'scout_view_ai_index';
const VIEW_NAME = `v-ai-index-${AI_INDEX_ID}`;
const DEST = 'ai-index-idx-scout-view';
const DS_AI_INDEX_ID = 'scout_view_ai_index_ds';
const DS_VIEW_NAME = `v-ai-index-${DS_AI_INDEX_ID}`;
const DS_DEST = 'ai-index-ds-scout-view';

const API_HEADERS = {
  ...testData.COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

// The `ai-index@mappings` fields the view filters on.
const MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    title: { type: 'keyword' },
    expires_at: { type: 'date' },
    governance: {
      properties: {
        lifecycle: { properties: { status: { type: 'keyword' } } },
        provenance: { properties: { created_by: { properties: { uri: { type: 'keyword' } } } } },
      },
    },
  },
} as const;

const ki = (id: string, extra: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-09-01T00:00:00Z',
  id,
  type: 'index_metadata',
  title: id,
  governance: { provenance: { created_by: { uri: 'workflow://scout' } } },
  ...extra,
});

apiTest.describe('context engine KI retrieval view', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    await esClient.indices.create({ index: DEST, mappings: MAPPINGS }, { ignore: [400] });
    await esClient.indices.createDataStream({ name: DS_DEST }, { ignore: [400] });
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    for (const id of [AI_INDEX_ID, DS_AI_INDEX_ID]) {
      await apiClient.delete(`${COLLECTION}/${id}`, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    }
    await esClient.esql.deleteView({ name: VIEW_NAME }, { ignore: [404] });
    await esClient.esql.deleteView({ name: DS_VIEW_NAME }, { ignore: [404] });
    await esClient.indices.delete({ index: DEST }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DS_DEST }, { ignore: [404] });
  });

  apiTest(
    'exposes only current, active, unexpired KIs through the view',
    async ({ apiClient, esClient }) => {
      await apiTest.step('creates the AI index and its view', async () => {
        const response = await apiClient.post(COLLECTION, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: {
            id: AI_INDEX_ID,
            dest: { type: 'index', value: DEST },
            automations: [],
            sources: [],
          },
        });
        expect(response).toHaveStatusCode(201);

        const { views } = await esClient.esql.getView({ name: VIEW_NAME });
        expect(views).toHaveLength(1);
        expect(views[0].query).toContain(`FROM ${DEST}`);
      });

      await apiTest.step('writes active, deleted, and expired KIs', async () => {
        await esClient.bulk({
          index: DEST,
          refresh: true,
          operations: [
            { index: { _id: 'active' } },
            ki('active'),
            { index: { _id: 'deleted' } },
            ki('deleted', { governance: { lifecycle: { status: 'deleted' } } }),
            { index: { _id: 'expired' } },
            ki('expired', { expires_at: '2000-01-01T00:00:00Z' }),
            { index: { _id: 'unexpired' } },
            ki('unexpired', { expires_at: '2100-01-01T00:00:00Z' }),
          ],
        });
      });

      await apiTest.step('the view returns the active KIs without governance columns', async () => {
        const response = await esClient.esql.query({
          query: `FROM ${VIEW_NAME} | KEEP id | SORT id`,
        });
        expect(response.values).toStrictEqual([['active'], ['unexpired']]);

        const { columns } = await esClient.esql.query({ query: `FROM ${VIEW_NAME} | LIMIT 1` });
        const governanceColumns = columns
          .map((column) => column.name)
          .filter((name) => name.startsWith('governance.'));
        expect(governanceColumns).toStrictEqual([]);
      });

      await apiTest.step('deleting the AI index removes the view', async () => {
        const response = await apiClient.delete(`${COLLECTION}/${AI_INDEX_ID}`, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const lookup = await esClient.esql.getView({ name: VIEW_NAME }, { ignore: [404] });
        expect(lookup.views ?? []).toHaveLength(0);
      });
    }
  );

  apiTest(
    'exposes only the latest revision of each KI through a data stream view',
    async ({ apiClient, esClient }) => {
      await apiTest.step('creates the AI index and its view', async () => {
        const response = await apiClient.post(COLLECTION, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: {
            id: DS_AI_INDEX_ID,
            dest: { type: 'data_stream', value: DS_DEST },
            automations: [],
            sources: [],
          },
        });
        expect(response).toHaveStatusCode(201);

        const { views } = await esClient.esql.getView({ name: DS_VIEW_NAME });
        expect(views).toHaveLength(1);
        expect(views[0].query).toContain('INLINE STATS latest = MAX(@timestamp) BY id');
        expect(views[0].query).toContain('INLINE STATS latest_doc = MAX(_id) BY id');
      });

      await apiTest.step('writes multiple revisions per KI', async () => {
        await esClient.bulk({
          index: DS_DEST,
          refresh: true,
          operations: [
            { create: {} },
            ki('revised', { '@timestamp': '2026-09-01T00:00:00Z', title: 'revised-v1' }),
            { create: {} },
            ki('revised', { '@timestamp': '2026-09-02T00:00:00Z', title: 'revised-v2' }),
            { create: {} },
            ki('retired', { '@timestamp': '2026-09-01T00:00:00Z' }),
            { create: {} },
            ki('retired', {
              '@timestamp': '2026-09-02T00:00:00Z',
              governance: { lifecycle: { status: 'deleted' } },
            }),
            { create: {} },
            ki('single'),
            { create: { _id: 'tied-a' } },
            ki('tied', { title: 'tied-a' }),
            { create: { _id: 'tied-b' } },
            ki('tied', { title: 'tied-b' }),
          ],
        });
      });

      await apiTest.step('the view returns one row per KI from its latest revision', async () => {
        const response = await esClient.esql.query({
          query: `FROM ${DS_VIEW_NAME} | KEEP id, title | SORT id`,
        });
        expect(response.values).toStrictEqual([
          ['revised', 'revised-v2'],
          ['single', 'single'],
          ['tied', 'tied-b'],
        ]);
      });
    }
  );
});
