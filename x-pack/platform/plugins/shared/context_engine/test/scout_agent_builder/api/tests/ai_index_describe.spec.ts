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
import { apiTest, testData, spaceScoped, columnValues, type EsqlResponse } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, AI_INDEX_QUERY_PATH, API_HEADERS, CONTEXT_ENGINE_READ } =
  testData;
// Unique per run: a retried `beforeAll` runs against the same stack, where fixed names would 409.
const RUN_ID = randomUUID().slice(0, 8);
const INDEX_A = `ai-index-idx-scout-describe-${RUN_ID}-a`;
// Bare index: keeps the built-in `ai-index-idx-*` template mappings.
const INDEX_B = `ai-index-idx-scout-describe-${RUN_ID}-b`;
const DATA_STREAM = `ai-index-ds-scout-describe-${RUN_ID}`;
// Deliberately never created: a just-registered AI Index has no backing store yet.
const MISSING_INDEX = `ai-index-idx-scout-describe-${RUN_ID}-missing`;
const SINGLE_AI_INDEX_ID = `scout-describe-single-${RUN_ID}`;
const TEMPLATE_AI_INDEX_ID = `scout-describe-template-${RUN_ID}`;
const DATA_STREAM_AI_INDEX_ID = `scout-describe-ds-${RUN_ID}`;
const MISSING_AI_INDEX_ID = `scout-describe-missing-index-${RUN_ID}`;

const describePath = (id: string) => `${AI_INDEX_COLLECTION_PATH}/${id}/_describe`;
const QUERY_PATH = AI_INDEX_QUERY_PATH;

/** KIs in INDEX_A; `other` is scoped to a space tests never use. */
const KI_DOCS = {
  detection: {
    type: 'detection',
    title: 'Billing errors',
    description: 'Failed invoice runs',
    content: 'Invoices that failed to process',
    tags: ['billing', 'errors'],
  },
  guide: {
    type: 'document',
    title: 'Billing guide',
    description: 'How billing works',
    content: 'Billing runs monthly',
    tags: ['billing'],
    ...spaceScoped('default'),
  },
  plain: { type: 'document', title: 'Plain document', tags: [] },
  other: {
    type: 'hidden',
    title: 'Billing secret',
    tags: ['secret'],
    ...spaceScoped(`other-space-${RUN_ID}`),
  },
};

const blockOf = (body: { response: string }): string => body.response;

/** Lines under `heading` (exact, or `heading (…)`) up to the next blank line. */
const sectionLines = (block: string, heading: string): string[] => {
  const lines = block.split('\n');
  const start = lines.findIndex((line) => line === heading || line.startsWith(`${heading} (`));
  if (start < 0) {
    return [];
  }
  const rest = lines.slice(start + 1);
  const end = rest.indexOf('');
  return end < 0 ? rest : rest.slice(0, end);
};

const fieldLine = (block: string, path: string): string | undefined =>
  sectionLines(block, 'Fields').find((line) => line.startsWith(`${path}: `));

const fieldPaths = (block: string): string[] =>
  sectionLines(block, 'Fields').map((line) => line.slice(0, line.indexOf(': ')));

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
    indices: [{ names: ['ai-index-idx-scout-describe-*', DATA_STREAM], privileges: ['read'] }],
  },
  kibana: [CONTEXT_ENGINE_READ],
};

/** `view_index_metadata` only, no `read`: can't list or describe it. */
const METADATA_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['ai-index-idx-scout-describe-*'], privileges: ['view_index_metadata'] }],
  },
  kibana: [CONTEXT_ENGINE_READ],
};

/**
 * `contextEngine:read` in Kibana, but the backing indices are outside the role's index pattern, so
 * the caller holds no privilege on them at all. Kibana authz lets the request through: only the
 * AI-Index-level readability check can stop it.
 */
const OTHER_INDEX_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [`ai-index-idx-scout-describe-unrelated-${RUN_ID}-*`],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
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

// The `agent_builder` Scout config set pins `contextEngine:enabled=true` through `uiSettings.overrides`,
// which is read-only and applies to every space, so the tests never toggle it.
apiTest.describe('context engine AI index describe API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let describeCredentials: RoleApiCredentials;
  let readOnlyCredentials: RoleApiCredentials;
  let metadataOnlyCredentials: RoleApiCredentials;
  let otherIndexCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    describeCredentials = await requestAuth.getApiKeyForCustomRole(DESCRIBE_ROLE);
    readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(READ_ONLY_ROLE);
    metadataOnlyCredentials = await requestAuth.getApiKeyForCustomRole(METADATA_ONLY_ROLE);
    otherIndexCredentials = await requestAuth.getApiKeyForCustomRole(OTHER_INDEX_ROLE);

    await esClient.indices.create({
      index: INDEX_A,
      mappings: {
        properties: {
          title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          content: { type: 'text' },
          type: { type: 'keyword' },
          tags: { type: 'keyword' },
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
    await esClient.indices.create({ index: INDEX_B });
    await esClient.indices.createDataStream({ name: DATA_STREAM });
    await esClient.bulk({
      index: INDEX_A,
      refresh: true,
      operations: Object.entries(KI_DOCS).flatMap(([id, doc]) => [{ index: { _id: id } }, doc]),
    });

    for (const body of [
      registerAiIndex(SINGLE_AI_INDEX_ID, { type: 'index', value: INDEX_A }),
      registerAiIndex(TEMPLATE_AI_INDEX_ID, { type: 'index', value: INDEX_B }),
      registerAiIndex(DATA_STREAM_AI_INDEX_ID, { type: 'data_stream', value: DATA_STREAM }),
      registerAiIndex(MISSING_AI_INDEX_ID, { type: 'index', value: MISSING_INDEX }),
    ]) {
      const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body,
      });
      expect(response).toHaveStatusCode(201);
    }
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    for (const id of [
      SINGLE_AI_INDEX_ID,
      TEMPLATE_AI_INDEX_ID,
      DATA_STREAM_AI_INDEX_ID,
      MISSING_AI_INDEX_ID,
    ]) {
      await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${id}`, {
        headers: { ...adminCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    }
    await esClient.indices.delete({ index: [INDEX_A, INDEX_B] }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DATA_STREAM }, { ignore: [404] });
  });

  apiTest('describes the fields of a single index', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const block = blockOf(response.body);
    expect(block.split('\n').slice(0, 3)).toStrictEqual([
      `AI index: ${SINGLE_AI_INDEX_ID}`,
      `Scout describe fixture ${SINGLE_AI_INDEX_ID}`,
      `Query with ES|QL against: ${INDEX_A}`,
    ]);
    // Fields not truncated: plain heading, no `(showing …)`.
    expect(block).toContain('\n\nFields\n');

    expect(fieldLine(block, 'status')).toBe('status: keyword, searchable, aggregatable');
    expect(fieldLine(block, 'title.keyword')).toBe(
      'title.keyword: keyword, searchable, aggregatable'
    );
    expect(fieldLine(block, 'permissions.kibana.privileges')).toMatch(
      /^permissions\.kibana\.privileges: nested/
    );
    const paths = fieldPaths(block);
    expect(paths).toStrictEqual([...paths].sort());
  });

  apiTest('lists the semantic fields from the built-in template', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(TEMPLATE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const block = blockOf(response.body);
    const semanticFields = sectionLines(block, 'Semantic fields');
    expect(semanticFields.length).toBeGreaterThan(0);
    for (const path of semanticFields) {
      expect(fieldLine(block, path)).toBe(`${path}: semantic_text, searchable`);
    }
  });

  apiTest('resolves a data stream through its backing indices', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(DATA_STREAM_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const block = blockOf(response.body);
    expect(block).toContain(`\nQuery with ES|QL against: ${DATA_STREAM}\n`);
    expect(fieldLine(block, '@timestamp')).toMatch(/^@timestamp: date/);
  });

  apiTest('counts types and tags for KIs visible in the current space', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const block = blockOf(response.body);
    expect(sectionLines(block, 'Knowledge item types')).toStrictEqual([
      '"document": 2',
      '"detection": 1',
    ]);
    expect(sectionLines(block, 'Tags')).toStrictEqual(['"billing": 2', '"errors": 1']);
  });

  apiTest('lists example queries that run as-is through _query', async ({ apiClient }) => {
    const described = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(described).toHaveStatusCode(200);
    const block = blockOf(described.body);
    const exampleQuery = (title: string) => sectionLines(block, title).join('\n');

    // Semantic branch needs a deployed inference endpoint: checked structurally here, and by the
    // ES|QL parser in unit tests.
    const hybrid = exampleQuery('Full text search, lexical and semantic fused together');
    expect(hybrid.startsWith(`FROM ${INDEX_A} METADATA _id, _index, _score\n| FORK\n`)).toBe(true);
    expect(hybrid).toContain('\n| FUSE\n');

    const run = async (query: string, params?: Record<string, string>) => {
      const response = await apiClient.post(QUERY_PATH, {
        headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { query, ...(params && { params }) },
      });
      expect(response).toHaveStatusCode(200);
      return response.body as EsqlResponse;
    };

    const filtered = await run(exampleQuery('Filter by knowledge item type and tag'), {
      type: 'document',
      tag: 'billing',
    });
    expect(columnValues(filtered, 'title')).toStrictEqual(['Billing guide']);

    const counted = await run(exampleQuery('Count by type'));
    expect(columnValues(counted, 'type')).toStrictEqual(['document', 'detection']);
    expect(columnValues(counted, 'count')).toStrictEqual([2, 1]);
  });

  apiTest('returns 404 for an unregistered AI index', async ({ apiClient }) => {
    const missingId = `scout-describe-missing-${RUN_ID}`;
    const response = await apiClient.get(describePath(missingId), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.message).toBe(`AI index '${missingId}' not found`);
  });

  for (const [kind, aiIndexId] of [
    ['an index', SINGLE_AI_INDEX_ID],
    ['a data stream', DATA_STREAM_AI_INDEX_ID],
  ] as const) {
    apiTest(
      `returns Elasticsearch 403 for ${kind} when the caller lacks view_index_metadata privilege`,
      async ({ apiClient }) => {
        const response = await apiClient.get(describePath(aiIndexId), {
          headers: { ...readOnlyCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
        // Elasticsearch refused `_mapping`; not Kibana's own authz layer.
        expect(response.body.message).toMatch(/security_exception|unauthorized/i);
      }
    );
  }

  apiTest(
    'returns Elasticsearch 403 when the caller lacks read privilege',
    async ({ apiClient }) => {
      const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
        headers: { ...metadataOnlyCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      // No `read` anywhere: Elasticsearch refuses the whole readability probe.
      expect(response.body.message).toMatch(/security_exception|unauthorized/i);
    }
  );

  apiTest(
    'returns 403 when the caller holds no privilege on the backing index',
    async ({ apiClient }) => {
      const response = await apiClient.get(describePath(SINGLE_AI_INDEX_ID), {
        headers: { ...otherIndexCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toContain(`AI index '${SINGLE_AI_INDEX_ID}' is not readable`);
    }
  );

  apiTest('describes an entry whose backing index does not exist yet', async ({ apiClient }) => {
    const response = await apiClient.get(describePath(MISSING_AI_INDEX_ID), {
      headers: { ...describeCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const block = blockOf(response.body);
    expect(block).toContain(`\nQuery with ES|QL against: ${MISSING_INDEX}\n`);
    expect(sectionLines(block, 'Fields')).toStrictEqual(['(none)']);
  });
});
