/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createHeaders,
  createIndex,
  deleteIndices,
  indexManagementApi,
  uniqueName,
} from '../fixtures';

const createIndexNameWithLength = (prefix: string, length: number) => {
  if (prefix.length > length) {
    throw new Error(`prefix length (${prefix.length}) exceeds desired length (${length})`);
  }
  return `${prefix}${'a'.repeat(length - prefix.length)}`;
};

apiTest.describe('Index Management index doc count API', { tag: tags.stateful.classic }, () => {
  const indices: string[] = [];

  apiTest.afterAll(async ({ esClient, log }) => {
    await deleteIndices(esClient, indices, log);
  });

  apiTest(
    'returns counts per index and fills missing buckets with 0',
    async ({ apiClient, esClient, samlAuth }) => {
      const indexA = await createIndex({ esClient, index: uniqueName('im-doc-count-a') });
      const indexB = await createIndex({ esClient, index: uniqueName('im-doc-count-b') });
      indices.push(indexA, indexB);

      await esClient.index({ index: indexA, document: { foo: 'a1' } });
      await esClient.index({ index: indexA, document: { foo: 'a2' } });
      await esClient.index({ index: indexA, document: { foo: 'a3' } });
      await esClient.indices.refresh({ index: [indexA, indexB] });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const response = await indexManagementApi(
        apiClient,
        createHeaders(cookieHeader)
      ).indices.getDocCounts([indexA, indexB]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        [indexA]: 3,
        [indexB]: 0,
      });
    }
  );

  apiTest('returns counts for more than 10 indices', async ({ apiClient, esClient, samlAuth }) => {
    const createdIndices = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        createIndex({ esClient, index: uniqueName(`im-doc-count-many-${index}`) })
      )
    );
    indices.push(...createdIndices);

    await esClient.index({ index: createdIndices[0], document: { foo: 'a1' } });
    await esClient.index({ index: createdIndices[11], document: { foo: 'z1' } });
    await esClient.indices.refresh({ index: createdIndices });

    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await indexManagementApi(
      apiClient,
      createHeaders(cookieHeader)
    ).indices.getDocCounts(createdIndices);

    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body)).toHaveLength(createdIndices.length);
    expect(response.body[createdIndices[0]]).toBe(1);
    expect(response.body[createdIndices[11]]).toBe(1);
    expect(response.body[createdIndices[5]]).toBe(0);
  });

  apiTest('supports 255 character index names', async ({ apiClient, esClient, log, samlAuth }) => {
    const longIndices: string[] = [];

    try {
      const prefixBase = uniqueName('im-doc-count-255');
      longIndices.push(
        ...(await Promise.all(
          Array.from({ length: 20 }, (_, index) => {
            const suffix = index.toString().padStart(2, '0');
            const indexName = createIndexNameWithLength(`${prefixBase}-${suffix}-`, 255);
            expect(indexName).toHaveLength(255);
            return createIndex({ esClient, index: indexName });
          })
        ))
      );
      indices.push(...longIndices);

      await esClient.bulk({
        refresh: 'wait_for',
        operations: longIndices.flatMap((index, i) => [{ index: { _index: index } }, { foo: i }]),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const response = await indexManagementApi(
        apiClient,
        createHeaders(cookieHeader)
      ).indices.getDocCounts(longIndices);

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(response.body)).toHaveLength(longIndices.length);
      for (const index of longIndices) {
        expect(response.body[index]).toBe(1);
      }
    } finally {
      await deleteIndices(esClient, longIndices, log);
    }
  });

  apiTest('validates request body', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await indexManagementApi(
      apiClient,
      createHeaders(cookieHeader)
    ).indices.getDocCounts([]);

    expect(response).toHaveStatusCode(400);
  });
});
