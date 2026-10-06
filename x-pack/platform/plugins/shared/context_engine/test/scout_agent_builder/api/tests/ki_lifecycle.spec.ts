/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData, columnValues, type EsqlResponse } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, AI_INDEX_QUERY_PATH, API_HEADERS } = testData;
// Unique per run so stale resources from an interrupted run cannot leak into the assertions.
const RUN_ID = randomUUID().slice(0, 8);
const AI_INDEX_ID = `scout_lifecycle_ai_index_${RUN_ID}`;
const DEST = `ai-index-idx-scout-lifecycle-${RUN_ID}`;
const DS_AI_INDEX_ID = `scout_lifecycle_ai_index_ds_${RUN_ID}`;
const DS_DEST = `ai-index-ds-scout-lifecycle-${RUN_ID}`;
// Never registered: the lifecycle pipeline applies to registered AI indices only.
const UNREGISTERED = `ai-index-idx-scout-lifecycle-unregistered-${RUN_ID}`;

// The `ai-index@mappings` fields the lifecycle pipeline filters on.
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

const ki = (id: string, { status, ...extra }: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-09-01T00:00:00Z',
  id,
  type: 'index_metadata',
  title: id,
  governance: {
    provenance: { created_by: { uri: 'workflow://scout' } },
    ...(status ? { lifecycle: { status } } : {}),
  },
  ...extra,
});

const registerAiIndex = (id: string, dest: { type: 'index' | 'data_stream'; value: string }) => ({
  id,
  dest,
  automations: [],
  sources: [],
});

apiTest.describe('context engine KI lifecycle filter', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;

  const run = async (apiClient: ApiClientFixture, query: string): Promise<EsqlResponse> => {
    const response = await apiClient.post(AI_INDEX_QUERY_PATH, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { query },
    });
    expect(response).toHaveStatusCode(200);
    return response.body as EsqlResponse;
  };

  apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    await esClient.indices.create({ index: DEST, mappings: MAPPINGS });
    await esClient.indices.create({ index: UNREGISTERED, mappings: MAPPINGS });
    await esClient.indices.createDataStream({ name: DS_DEST });

    for (const body of [
      registerAiIndex(AI_INDEX_ID, { type: 'index', value: DEST }),
      registerAiIndex(DS_AI_INDEX_ID, { type: 'data_stream', value: DS_DEST }),
    ]) {
      const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body,
      });
      expect(response).toHaveStatusCode(201);
    }

    const { errors } = await esClient.bulk({
      refresh: true,
      operations: [
        { index: { _index: DEST, _id: 'active' } },
        ki('active'),
        { index: { _index: DEST, _id: 'deleted' } },
        ki('deleted', { status: 'deleted' }),
        { index: { _index: DEST, _id: 'single' } },
        ki('single'),
        { index: { _index: DEST, _id: 'expired' } },
        ki('expired', { expires_at: '2000-01-01T00:00:00Z' }),
        { index: { _index: DEST, _id: 'unexpired' } },
        ki('unexpired', { expires_at: '2100-01-01T00:00:00Z' }),
        { index: { _index: UNREGISTERED, _id: 'deleted' } },
        ki('deleted', { status: 'deleted' }),
        { create: { _index: DS_DEST } },
        ki('revised', { '@timestamp': '2026-09-01T00:00:00Z', title: 'revised-v1' }),
        { create: { _index: DS_DEST } },
        ki('revised', { '@timestamp': '2026-09-02T00:00:00Z', title: 'revised-v2' }),
        { create: { _index: DS_DEST } },
        ki('retired', { '@timestamp': '2026-09-01T00:00:00Z' }),
        { create: { _index: DS_DEST } },
        ki('retired', { '@timestamp': '2026-09-02T00:00:00Z', status: 'deleted' }),
        { create: { _index: DS_DEST } },
        ki('single'),
        { create: { _index: DS_DEST, _id: 'tied-a' } },
        ki('tied', { title: 'tied-a' }),
        { create: { _index: DS_DEST, _id: 'tied-b' } },
        ki('tied', { title: 'tied-b' }),
      ],
    });
    expect(errors).toBe(false);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    for (const id of [AI_INDEX_ID, DS_AI_INDEX_ID]) {
      await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${id}`, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    }
    await esClient.indices.delete({ index: [DEST, UNREGISTERED] }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DS_DEST }, { ignore: [404] });
  });

  apiTest('returns only active, unexpired KIs from a registered index', async ({ apiClient }) => {
    const body = await run(apiClient, `FROM ${DEST} | KEEP id | SORT id`);

    expect(columnValues(body, 'id')).toStrictEqual(['active', 'single', 'unexpired']);
  });

  apiTest('keeps KIs that share an id across targets', async ({ apiClient }) => {
    const body = await run(apiClient, `FROM ${DEST}, ${DS_DEST} | KEEP id | SORT id`);

    expect(columnValues(body, 'id')).toStrictEqual([
      'active',
      'revised',
      'single',
      'single',
      'tied',
      'unexpired',
    ]);
  });

  apiTest('drops governance unless the query names it', async ({ apiClient }) => {
    const dropped = await run(apiClient, `FROM ${DEST} | LIMIT 1`);
    const governanceColumns = dropped.columns
      .map(({ name }) => name)
      .filter((name) => name.startsWith('governance.'));
    expect(governanceColumns).toStrictEqual([]);

    const kept = await run(
      apiClient,
      `FROM ${DEST} | WHERE governance.lifecycle.status == "deleted" | KEEP id, governance.provenance.created_by.uri`
    );
    expect(kept.values).toStrictEqual([['deleted', 'workflow://scout']]);
  });

  apiTest('applies the filter through a pattern', async ({ apiClient }) => {
    const body = await run(
      apiClient,
      `FROM ai-index-idx-scout-lifecycle-${RUN_ID}* | KEEP id | SORT id`
    );

    expect(columnValues(body, 'id')).toStrictEqual(['active', 'single', 'unexpired']);
  });

  apiTest(
    'returns only the latest revision of each KI from a data stream',
    async ({ apiClient }) => {
      const body = await run(apiClient, `FROM ${DS_DEST} | KEEP id, title | SORT id`);

      expect(body.values).toStrictEqual([
        ['revised', 'revised-v2'],
        ['single', 'single'],
        ['tied', 'tied-b'],
      ]);
    }
  );

  apiTest('scores a full text match after the revision collapse', async ({ apiClient }) => {
    const body = await run(
      apiClient,
      `FROM ${DS_DEST} METADATA _score | WHERE title:"revised-v2" | KEEP id, _score`
    );

    expect(columnValues(body, 'id')).toStrictEqual(['revised']);
    expect(typeof columnValues(body, '_score')[0]).toBe('number');

    const superseded = await run(
      apiClient,
      `FROM ${DS_DEST} METADATA _score | WHERE title:"v1" | KEEP id`
    );
    expect(superseded.values).toStrictEqual([]);
  });

  apiTest('describe counts only the newest active revisions', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${AI_INDEX_COLLECTION_PATH}/${DS_AI_INDEX_ID}/_describe`,
      {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.response).toContain('Knowledge item types\n"index_metadata": 3\n');
  });

  apiTest('reads an unregistered index as-is', async ({ apiClient }) => {
    const body = await run(apiClient, `FROM ${UNREGISTERED} | KEEP id`);

    expect(columnValues(body, 'id')).toStrictEqual(['deleted']);
  });
});
