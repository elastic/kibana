/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { buildIndexDocCountQuery, toIndexDocCounts } from '../../../../../common/lib';
import { apiTest, testData } from '../../fixtures';

const { COMMON_HEADERS, ES_CLIENT_API_VERSION, ES_CLIENT_PROXY_PATH } = testData;

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

// Sends the browser's doc count query through the Elasticsearch proxy.
apiTest.describe(
  'Index doc count through the Elasticsearch proxy',
  { tag: tags.stateful.classic },
  () => {
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

    const getDocCounts = async (apiClient: ApiClientFixture, indexNames: string[]) => {
      const response = await apiClient.post(
        `${ES_CLIENT_PROXY_PATH}/_query?allow_partial_results=true`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...credentials.apiKeyHeader,
            'elastic-api-version': ES_CLIENT_API_VERSION,
          },
          responseType: 'json',
          body: JSON.stringify({ query: buildIndexDocCountQuery(indexNames) }),
        }
      );
      expect(response).toHaveStatusCode(200);
      return toIndexDocCounts(response.body, indexNames);
    };

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

        expect(await getDocCounts(apiClient, [indexA, indexB])).toStrictEqual({
          [indexA]: 3,
          [indexB]: 0,
        });
      }
    );

    apiTest('returns counts for more than 10 indices', async ({ apiClient, esClient }) => {
      const indices = Array.from({ length: 12 }, (_, i) => `${INDEX_PREFIX}many-${i}`);
      await Promise.all(indices.map((index) => esClient.indices.create({ index })));

      // Index docs in the first and the last one, so a missing count beyond the 10th would show up.
      await esClient.index({ index: indices[0], document: { foo: 'a1' } });
      await esClient.index({ index: indices[11], document: { foo: 'z1' } });
      await esClient.indices.refresh({ index: indices });

      const counts = await getDocCounts(apiClient, indices);

      expect(Object.keys(counts)).toHaveLength(indices.length);
      expect(counts[indices[0]]).toBe(1);
      expect(counts[indices[11]]).toBe(1);
      expect(counts[indices[5]]).toBe(0);
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

        const counts = await getDocCounts(apiClient, indices);

        expect(Object.keys(counts).sort()).toStrictEqual([...indices].sort());
        const notCountedOnce = Object.entries(counts).filter(([, count]) => count !== 1);
        expect(notCountedOnce).toStrictEqual([]);
      }
    );
  }
);
