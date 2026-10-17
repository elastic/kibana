/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { INTERNAL_API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_PREFIX = 'index-management-api-doc-count-';

const MAX_INDEX_NAME_LENGTH = 255;

const padIndexName = (prefix: string) =>
  `${prefix}${'a'.repeat(MAX_INDEX_NAME_LENGTH - prefix.length)}`;

// Index names travel in the request path, and this suite creates 255-character ones, so delete in
// small batches to stay under Elasticsearch's HTTP line limit (`too_long_http_line_exception`).
const DELETE_BATCH_SIZE = 4;

// ES rejects wildcard deletes (`action.destructive_requires_name`), so resolve the names by a
// wildcard read and delete them explicitly.
const deleteSuiteIndices = async (esClient: EsClient) => {
  const found = Object.keys(
    await esClient.indices.get({ index: `${INDEX_PREFIX}*`, allow_no_indices: true })
  );
  for (let i = 0; i < found.length; i += DELETE_BATCH_SIZE) {
    await esClient.indices.delete({ index: found.slice(i, i + DELETE_BATCH_SIZE) });
  }
};

apiTest.describe('Index doc count API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteSuiteIndices(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteSuiteIndices(esClient);
  });

  const getDocCounts = (apiClient: ApiClientFixture, indexNames: string[]) =>
    apiClient.post(`${INTERNAL_API_BASE_PATH}/index_doc_count`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indexNames }),
    });

  apiTest(
    'returns counts per index and fills missing buckets with 0',
    async ({ apiClient, esClient }) => {
      const indexA = `${INDEX_PREFIX}a`;
      const indexB = `${INDEX_PREFIX}b`;
      await esClient.indices.create({ index: indexA });
      await esClient.indices.create({ index: indexB });

      await esClient.index({ index: indexA, document: { foo: 'a1' } });
      await esClient.index({ index: indexA, document: { foo: 'a2' } });
      await esClient.index({ index: indexA, document: { foo: 'a3' } });
      await esClient.indices.refresh({ index: [indexA, indexB] });

      const response = await getDocCounts(apiClient, [indexA, indexB]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ [indexA]: 3, [indexB]: 0 });
    }
  );

  apiTest('returns counts for more than 10 indices', async ({ apiClient, esClient }) => {
    // The terms aggregation size must cover every requested index, not just the first 10 buckets.
    const indices = Array.from({ length: 12 }, (_, i) => `${INDEX_PREFIX}many-${i}`);
    await Promise.all(indices.map((index) => esClient.indices.create({ index })));

    // Index docs in the first and the last one, so a missing bucket beyond the 10th would show up.
    await esClient.index({ index: indices[0], document: { foo: 'a1' } });
    await esClient.index({ index: indices[11], document: { foo: 'z1' } });
    await esClient.indices.refresh({ index: indices });

    const response = await getDocCounts(apiClient, indices);

    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body)).toHaveLength(indices.length);
    expect(response.body[indices[0]]).toBe(1);
    expect(response.body[indices[11]]).toBe(1);
    expect(response.body[indices[5]]).toBe(0);
  });

  apiTest(
    `supports ${MAX_INDEX_NAME_LENGTH} character index names`,
    async ({ apiClient, esClient }) => {
      const indices = Array.from({ length: 20 }, (_, i) =>
        padIndexName(`${INDEX_PREFIX}${i.toString().padStart(2, '0')}-`)
      );
      expect(indices.every((index) => index.length === MAX_INDEX_NAME_LENGTH)).toBe(true);

      await Promise.all(indices.map((index) => esClient.indices.create({ index })));
      await esClient.bulk({
        refresh: 'wait_for',
        operations: indices.flatMap((index, i) => [{ index: { _index: index } }, { foo: i }]),
      });

      const response = await getDocCounts(apiClient, indices);

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(response.body).sort()).toStrictEqual([...indices].sort());
      const notCountedOnce = Object.entries(response.body).filter(([, count]) => count !== 1);
      expect(notCountedOnce).toStrictEqual([]);
    }
  );

  apiTest('rejects an empty list of index names', async ({ apiClient }) => {
    const response = await getDocCounts(apiClient, []);

    expect(response).toHaveStatusCode(400);
  });
});
