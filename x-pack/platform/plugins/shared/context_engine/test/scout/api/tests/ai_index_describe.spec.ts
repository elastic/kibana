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

const AI_INDEX_COLLECTION_PATH = 'api/context_engine/ai_index';
const CONTEXT_ENGINE_ENABLED_SETTING = 'contextEngine:enabled';
// Unique per run: a retried `beforeAll` runs against the same stack, where fixed names would 409.
const RUN_ID = randomUUID().slice(0, 8);
const INDEX_A = `ai-index-idx-scout-describe-${RUN_ID}-a`;
const INDEX_B = `ai-index-idx-scout-describe-${RUN_ID}-b`;
const INDEX_PATTERN = `ai-index-idx-scout-describe-${RUN_ID}-*`;
const DATA_STREAM = `ai-index-ds-scout-describe-${RUN_ID}`;
const PATTERN_AI_INDEX_ID = `scout-describe-pattern-${RUN_ID}`;
const SINGLE_AI_INDEX_ID = `scout-describe-single-${RUN_ID}`;
const DATA_STREAM_AI_INDEX_ID = `scout-describe-ds-${RUN_ID}`;

const describePath = (id: string) => `${AI_INDEX_COLLECTION_PATH}/${id}/_describe`;

interface DescribedFields {
  fields: Array<{ path: string; type: string; searchable: boolean; aggregatable: boolean }>;
  semantic_fields: string[];
}

const fieldNamed = (fields: DescribedFields['fields'], path: string) =>
  fields.find((field) => field.path === path);

const API_HEADERS = {
  ...testData.COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

const CONTEXT_ENGINE_READ = { base: [], feature: { contextEngine: ['read'] }, spaces: ['*'] };

/** Documented caller: `contextEngine:read` + `read`, `view_index_metadata` on backing indices. */
const DESCRIBE_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['ai-index-idx-scout-describe-*', DATA_STREAM],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [CONTEXT_ENGINE_READ],
};

/** `read` only, no `view_index_metadata`: ES refuses `_mapping`. */
const READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['ai-index-idx-scout-describe-*'], privileges: ['read'] }],
  },
  kibana: [CONTEXT_ENGINE_READ],
};

const registerAiIndex = (id: string, dest: { type: 'index' | 'data_stream'; value: string }) => ({
  id,
  description: `Scout describe fixture ${id}`,
  dest,
  automations: [],
  sources: [],
});

apiTest.describe('context engine AI index describe API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let describeCredentials: RoleApiCredentials;
  let readOnlyCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient, apiClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    describeCredentials = await requestAuth.getApiKeyForCustomRole(DESCRIBE_ROLE);
    readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(READ_ONLY_ROLE);

    await kbnClient.uiSettings.update({ [CONTEXT_ENGINE_ENABLED_SETTING]: true });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();

    await esClient.indices.create({
      index: INDEX_A,
      mappings: {
        properties: {
          title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          status: { type: 'keyword' },
          permissions: {
            properties: {
              kibana: {
                properties: {
                  privileges: {
                    type: 'nested',
                    properties: { space: { type: 'keyword' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    await esClient.indices.create({
      index: INDEX_B,
      mappings: { properties: { title: { type: 'text' }, status: { type: 'long' } } },
    });
    await esClient.indices.createDataStream({ name: DATA_STREAM });

    for (const body of [
      registerAiIndex(PATTERN_AI_INDEX_ID, { type: 'index', value: INDEX_PATTERN }),
      registerAiIndex(SINGLE_AI_INDEX_ID, { type: 'index', value: INDEX_A }),
      registerAiIndex(DATA_STREAM_AI_INDEX_ID, { type: 'data_stream', value: DATA_STREAM }),
    ]) {
      const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body,
      });
      expect(response).toHaveStatusCode(201);
    }
  });

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    for (const id of [PATTERN_AI_INDEX_ID, SINGLE_AI_INDEX_ID, DATA_STREAM_AI_INDEX_ID]) {
      await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${id}`, {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    }
    await esClient.indices.delete({ index: [INDEX_A, INDEX_B] }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DATA_STREAM }, { ignore: [404] });
    await kbnClient.uiSettings.unset(CONTEXT_ENGINE_ENABLED_SETTING);
  });

  apiTest('merges mapping types with field caps across a pattern', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(PATTERN_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      id: PATTERN_AI_INDEX_ID,
      esql_target: INDEX_PATTERN,
      dest: { type: 'index', value: INDEX_PATTERN },
      managed: false,
      truncated: { fields: false, query_templates: false },
    });

    const { fields, semantic_fields: semanticFields } = response.body as DescribedFields;
    expect(fieldNamed(fields, 'status')).toStrictEqual({
      path: 'status',
      type: 'conflict',
      searchable: true,
      aggregatable: true,
    });
    expect(fieldNamed(fields, 'title.keyword')).toStrictEqual({
      path: 'title.keyword',
      type: 'keyword',
      searchable: true,
      aggregatable: true,
    });
    expect(fieldNamed(fields, 'permissions.kibana.privileges')).toMatchObject({ type: 'nested' });
    const paths = fields.map(({ path }) => path);
    expect(paths).toStrictEqual([...paths].sort());

    // Built-in `ai-index-idx-*` template adds `semantic_text` fields.
    expect(semanticFields.length).toBeGreaterThan(0);
    for (const path of semanticFields) {
      expect(fieldNamed(fields, path)).toMatchObject({ type: 'semantic_text', searchable: true });
    }
  });

  apiTest('reports the exact type for a single index', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.esql_target).toBe(INDEX_A);
    expect(fieldNamed(response.body.fields, 'status')).toStrictEqual({
      path: 'status',
      type: 'keyword',
      searchable: true,
      aggregatable: true,
    });
  });

  apiTest('resolves a data stream through its backing indices', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(DATA_STREAM_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.esql_target).toBe(DATA_STREAM);
    expect(fieldNamed(response.body.fields, '@timestamp')).toMatchObject({ type: 'date' });
  });

  apiTest('returns 404 for an unregistered AI index', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(`scout-describe-missing-${RUN_ID}`), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'returns Elasticsearch 403 when the caller lacks view_index_metadata',
    async ({ apiClient }) => {
      const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
        headers: { ...readOnlyCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
