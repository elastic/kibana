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
const QUERY_PATH = `${AI_INDEX_COLLECTION_PATH}/_query`;
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

interface DescribedContent {
  ki_type_counts: Array<{ type: string; count: number }>;
  tag_counts: Array<{ tag: string; count: number }>;
  query_templates: Array<{ ki_id: string; title: string; description?: string; esql: string }>;
  suggested_queries: Record<string, string>;
}

interface EsqlResponse {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

const fieldNamed = (fields: DescribedFields['fields'], path: string) =>
  fields.find((field) => field.path === path);

const columnValues = ({ columns, values }: EsqlResponse, name: string): unknown[] => {
  const index = columns.findIndex((column) => column.name === name);
  return values.map((row) => row[index]);
};

const spaceScoped = (spaceId: string) => ({
  permissions: { kibana: { privileges: [{ space: spaceId }] } },
});

/** KIs in INDEX_A; `other` is scoped to a space tests never use. */
const KI_DOCS = {
  detection: {
    type: 'detection',
    title: 'Billing errors',
    description: 'Failed invoice runs',
    tags: ['billing', 'errors'],
    attributes: { esql: 'FROM logs-* | LIMIT 5' },
  },
  guide: {
    type: 'document',
    title: 'Billing guide',
    tags: ['billing'],
    attributes: { esql: ['FROM a | LIMIT 1', 'FROM b | LIMIT 1'] },
    ...spaceScoped('default'),
  },
  plain: { type: 'document', title: 'Plain document', tags: [] },
  other: {
    type: 'hidden',
    title: 'Billing secret',
    tags: ['secret'],
    attributes: { esql: 'FROM secret | LIMIT 1' },
    ...spaceScoped(`other-space-${RUN_ID}`),
  },
};

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
          description: { type: 'text' },
          type: { type: 'keyword' },
          tags: { type: 'keyword' },
          attributes: { type: 'flattened' },
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
    await esClient.bulk({
      index: INDEX_A,
      refresh: true,
      operations: Object.entries(KI_DOCS).flatMap(([id, doc]) => [{ index: { _id: id } }, doc]),
    });

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

  apiTest('counts types and tags for KIs visible in the current space', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { ki_type_counts: typeCounts, tag_counts: tagCounts } = response.body as DescribedContent;
    expect(typeCounts).toStrictEqual([
      { type: 'document', count: 2 },
      { type: 'detection', count: 1 },
    ]);
    expect(tagCounts).toStrictEqual([
      { tag: 'billing', count: 2 },
      { tag: 'errors', count: 1 },
    ]);
  });

  apiTest('lists query templates from visible KIs, one per query, by id', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { query_templates: templates } = response.body as DescribedContent;
    expect(templates).toStrictEqual([
      {
        ki_id: 'detection',
        title: 'Billing errors',
        description: 'Failed invoice runs',
        esql: 'FROM logs-* | LIMIT 5',
      },
      { ki_id: 'guide', title: 'Billing guide', esql: 'FROM a | LIMIT 1' },
      { ki_id: 'guide', title: 'Billing guide', esql: 'FROM b | LIMIT 1' },
    ]);
  });

  apiTest('suggests queries that run as-is through _query', async ({ apiClient }) => {
    const described = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(described).toHaveStatusCode(200);
    const { suggested_queries: suggested } = described.body as DescribedContent;
    expect(Object.keys(suggested).sort()).toStrictEqual([
      'extract_esql_attribute',
      'hybrid_search',
      'keyword_search',
      'scoped_hybrid_search',
    ]);
    // Semantic branches need a deployed inference endpoint, so hybrid variants are checked
    // structurally here and by the ES|QL parser in unit tests.
    expect(suggested.hybrid_search).toContain('| FORK\n');
    expect(suggested.hybrid_search).toContain('| FUSE\n');
    expect(suggested.scoped_hybrid_search).toContain('| WHERE `type` == "document"\n| FORK\n');

    const run = async (query: string, params?: Record<string, string>) => {
      const response = await apiClient.post(QUERY_PATH, {
        headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { query, ...(params && { params }) },
      });
      expect(response).toHaveStatusCode(200);
      return columnValues(response.body as EsqlResponse, 'title').sort();
    };

    expect(await run(suggested.keyword_search, { query: 'billing' })).toStrictEqual([
      'Billing errors',
      'Billing guide',
    ]);
    expect(await run(suggested.extract_esql_attribute)).toStrictEqual([
      'Billing errors',
      'Billing guide',
    ]);
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
