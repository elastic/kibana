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

const QUERY_PATH = 'api/context_engine/ai_index/_query';
const CONTEXT_ENGINE_ENABLED_SETTING = 'contextEngine:enabled';
// Unique per run: a retried `beforeAll` runs against the same stack, where fixed names would 409.
const RUN_ID = randomUUID().slice(0, 8);
const SPACE_AWARE_INDEX = `ai-index-idx-scout-query-spaced-${RUN_ID}`;
const PLAIN_INDEX = `ai-index-idx-scout-query-plain-${RUN_ID}`;
const OTHER_SPACE_ID = `ce-query-other-${RUN_ID}`;

const API_HEADERS = {
  ...testData.COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

const CONTEXT_ENGINE_READ = { base: [], feature: { contextEngine: ['read'] }, spaces: ['*'] };

/** The documented caller: `contextEngine:read` plus ES `read` on the backing indices. */
const QUERY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['ai-index-idx-scout-query-*'], privileges: ['read'] }],
  },
  kibana: [CONTEXT_ENGINE_READ],
};

/** Reaches the route but holds no index privilege, so Elasticsearch must refuse the read. */
const NO_INDEX_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [CONTEXT_ENGINE_READ],
};

const spaceScoped = (space: string) => ({
  permissions: { kibana: { privileges: [{ space }] } },
});

const spacedDocs = [
  { id: 'public', title: 'No privileges element' },
  { id: 'global', title: 'Wildcard space', ...spaceScoped('*') },
  { id: 'default_only', title: 'Default space', ...spaceScoped('default') },
  { id: 'other_only', title: 'Other space', ...spaceScoped(OTHER_SPACE_ID) },
];

const plainDocs = [
  { id: 'plain_a', title: 'Plain A' },
  { id: 'plain_b', title: 'Plain B' },
];

const idsOf = (body: { columns: Array<{ name: string }>; values: unknown[][] }): string[] => {
  const idColumn = body.columns.findIndex((column) => column.name === 'id');
  return body.values.map((row) => String(row[idColumn]));
};

apiTest.describe('context engine AI index query API', { tag: tags.stateful.classic }, () => {
  let queryCredentials: RoleApiCredentials;
  let noIndexReadCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient }) => {
    queryCredentials = await requestAuth.getApiKeyForCustomRole(QUERY_ROLE);
    noIndexReadCredentials = await requestAuth.getApiKeyForCustomRole(NO_INDEX_READ_ROLE);

    await kbnClient.spaces.create({ id: OTHER_SPACE_ID, name: 'CE query other space' });
    // The gate is a per-space setting; each space under test has to enable it.
    await kbnClient.uiSettings.update({ [CONTEXT_ENGINE_ENABLED_SETTING]: true });
    await kbnClient.uiSettings.update(
      { [CONTEXT_ENGINE_ENABLED_SETTING]: true },
      { space: OTHER_SPACE_ID }
    );
    await kbnClient.uiSettings.waitForEventualCacheRefresh();

    await esClient.indices.create({
      index: SPACE_AWARE_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { type: 'text' },
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
      index: PLAIN_INDEX,
      mappings: { properties: { id: { type: 'keyword' }, title: { type: 'text' } } },
    });
    await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        ...spacedDocs.flatMap((doc) => [
          { index: { _index: SPACE_AWARE_INDEX, _id: doc.id } },
          doc,
        ]),
        ...plainDocs.flatMap((doc) => [{ index: { _index: PLAIN_INDEX, _id: doc.id } }, doc]),
      ],
    });
  });

  apiTest.afterAll(async ({ kbnClient, esClient }) => {
    await esClient.indices.delete({ index: [SPACE_AWARE_INDEX, PLAIN_INDEX] }, { ignore: [404] });
    await kbnClient.spaces.delete(OTHER_SPACE_ID);
    await kbnClient.uiSettings.unset(CONTEXT_ENGINE_ENABLED_SETTING);
  });

  apiTest('scopes reads to the request space', async ({ apiClient }) => {
    const esql = `FROM ${SPACE_AWARE_INDEX} | KEEP id | SORT id`;

    await apiTest.step('default space sees public, wildcard and default-only docs', async () => {
      const response = await apiClient.post(QUERY_PATH, {
        headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { query: esql },
      });

      expect(response).toHaveStatusCode(200);
      expect(idsOf(response.body)).toStrictEqual(['default_only', 'global', 'public']);
    });

    await apiTest.step(
      'another space sees its own docs and never the default-only one',
      async () => {
        const response = await apiClient.post(`s/${OTHER_SPACE_ID}/${QUERY_PATH}`, {
          headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: { query: esql },
        });

        expect(response).toHaveStatusCode(200);
        expect(idsOf(response.body)).toStrictEqual(['global', 'other_only', 'public']);
      }
    );
  });

  apiTest('keeps indices without the privileges mapping fully visible', async ({ apiClient }) => {
    const response = await apiClient.post(`s/${OTHER_SPACE_ID}/${QUERY_PATH}`, {
      headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { query: `FROM ${PLAIN_INDEX} | KEEP id | SORT id` },
    });

    expect(response).toHaveStatusCode(200);
    expect(idsOf(response.body)).toStrictEqual(['plain_a', 'plain_b']);
  });

  apiTest(
    'passes multi-index FROM through with the filter applied to each',
    async ({ apiClient }) => {
      const response = await apiClient.post(QUERY_PATH, {
        headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { query: `FROM ${SPACE_AWARE_INDEX},${PLAIN_INDEX} | KEEP id | SORT id` },
      });

      expect(response).toHaveStatusCode(200);
      expect(idsOf(response.body)).toStrictEqual([
        'default_only',
        'global',
        'plain_a',
        'plain_b',
        'public',
      ]);
    }
  );

  apiTest('caps a trailing LIMIT to the requested limit', async ({ apiClient }) => {
    const response = await apiClient.post(QUERY_PATH, {
      headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { query: `FROM ${SPACE_AWARE_INDEX} | KEEP id | SORT id | LIMIT 5000`, limit: 2 },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.values).toHaveLength(2);
  });

  apiTest('binds named params', async ({ apiClient }) => {
    const response = await apiClient.post(QUERY_PATH, {
      headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: {
        query: `FROM ${SPACE_AWARE_INDEX} | WHERE id == ?id | KEEP id`,
        params: { id: 'global' },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(idsOf(response.body)).toStrictEqual(['global']);
  });

  apiTest('returns Elasticsearch 403 when the caller lacks index read', async ({ apiClient }) => {
    const response = await apiClient.post(QUERY_PATH, {
      headers: { ...noIndexReadCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { query: `FROM ${SPACE_AWARE_INDEX} | KEEP id` },
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest('returns 400 for invalid ES|QL', async ({ apiClient }) => {
    const response = await apiClient.post(QUERY_PATH, {
      headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { query: `FROM ${SPACE_AWARE_INDEX} | NOT_A_COMMAND` },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects a body without a query', async ({ apiClient }) => {
    const response = await apiClient.post(QUERY_PATH, {
      headers: { ...queryCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { limit: 10 },
    });

    expect(response).toHaveStatusCode(400);
  });
});
