/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { createExpectRbacForbidden, roleHeaders } from '../common/api_helpers';
import type { RoleName } from '../common/roles';
import {
  ALL_SAVED_OBJECT_INDICES,
  getAggregatedSpaceData,
  loadSpace2Objects,
} from '../common/saved_objects';
import { getTestScenariosForSpace, SPACE_2 } from '../common/spaces';
import { apiTest } from '../fixtures';

interface ResponseContext {
  esClient: Client;
}

interface DeleteTest {
  statusCode: number;
  response: (resp: ApiClientResponse, ctx: ResponseContext) => Promise<void> | void;
}

export interface DeleteTests {
  exists: DeleteTest;
  reservedSpace: DeleteTest;
  doesntExist: DeleteTest;
}

interface DeleteTestDefinition {
  user: RoleName;
  spaceId: string;
  tests: DeleteTests;
}

/**
 * Polls `check` until it returns true or the timeout elapses. A local helper on purpose:
 * `@kbn/scout/api` exposes a deliberately restricted `expect` without `expect.poll` /
 * `toPass` (see `kbn-scout/src/playwright/matchers/api/README.md`), so polling
 * eventually-consistent ES state needs a hand-rolled loop in API suites.
 */
const waitFor = async (label: string, timeoutMs: number, check: () => Promise<boolean>) => {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError}` : ''}`);
};

export const expectRbacForbidden = createExpectRbacForbidden('Unauthorized to delete spaces');

export { expectNotFound } from '../common/api_helpers';

export const expectReservedSpaceResult = (resp: ApiClientResponse) => {
  expect(resp.body).toStrictEqual({
    error: 'Bad Request',
    statusCode: 400,
    message: `The default space cannot be deleted because it is reserved.`,
  });
};

/**
 * Asserts that deleting `space_2` cascaded correctly: the space's own objects are
 * gone and any multi-namespace object no longer references `space_2`.
 */
export const expectEmptyResult = async (
  _resp: ApiClientResponse,
  { esClient }: ResponseContext
) => {
  await waitFor('space_2 to be deleted', 5000, async () => {
    const response = await getAggregatedSpaceData(esClient, [
      'visualization',
      'dashboard',
      'space',
      'index-pattern',
    ]);
    const buckets = response.aggregations?.count.buckets;
    return !buckets?.some((bucket) => bucket.key === 'space_2');
  });

  const response = await getAggregatedSpaceData(esClient, [
    'visualization',
    'dashboard',
    'space',
    'index-pattern',
  ]);
  const buckets = response.aggregations?.count.buckets;

  const expectedBuckets = [
    {
      key: 'default',
      doc_count: 18,
      countByType: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          { key: 'index-pattern', doc_count: 15 },
          { key: 'space', doc_count: 3 },
        ],
      },
    },
    {
      key: 'space_1',
      doc_count: 16,
      countByType: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          { key: 'index-pattern', doc_count: 12 },
          { key: 'visualization', doc_count: 3 },
          { key: 'dashboard', doc_count: 1 },
        ],
      },
    },
    {
      key: 'other_space',
      doc_count: 4,
      countByType: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [{ key: 'index-pattern', doc_count: 4 }],
      },
    },
    {
      key: 'space_3',
      doc_count: 3,
      countByType: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [{ key: 'index-pattern', doc_count: 3 }],
      },
    },
  ];

  expect(buckets).toStrictEqual(expectedBuckets);

  const multiNamespaceResponse = await esClient.search<Record<string, any>>({
    index: ALL_SAVED_OBJECT_INDICES,
    ignore_unavailable: true,
    size: 100,
    query: { terms: { type: ['index-pattern'] } },
  });
  const docs = multiNamespaceResponse.hits.hits as Array<{
    _id: string;
    _source?: { namespaces: string[] };
  }>;
  expect(docs).toHaveLength(34);
  for (const doc of docs) {
    expect(doc._source?.namespaces.includes('space_2')).toBe(false);
  }
};

/**
 * Deletes an existing space (`space_2`), the reserved default space, and a
 * non-existent space (`space_7`) from the target space's URL context. `space_2`
 * is recreated + reloaded after any test that deleted it so each deletion starts
 * from a known state.
 */
export const deleteTest = (description: string, { user, spaceId, tests }: DeleteTestDefinition) => {
  apiTest.describe(description, () => {
    apiTest.afterEach(async ({ kbnClient }) => {
      // Recreate space_2 and reload its objects only when a test actually deleted it
      // (only the authorized `exists` scenario does). This lets genuine recreate/reload
      // failures propagate instead of being swallowed together with the 409s the
      // previous unconditional recreate produced on every non-deleting test.
      const existing = await kbnClient.request({
        method: 'GET',
        path: '/api/spaces/space/space_2',
        ignoreErrors: [404],
      });
      if (existing.status === 404) {
        await kbnClient.request({ method: 'POST', path: '/api/spaces/space', body: SPACE_2 });
        await loadSpace2Objects(kbnClient);
      }
    });

    getTestScenariosForSpace(spaceId).forEach(({ urlPrefix, scenario }) => {
      apiTest(
        `should return ${tests.exists.statusCode} ${scenario}`,
        async ({ apiClient, esClient, samlAuth }) => {
          const response = await apiClient.delete(`${urlPrefix}/api/spaces/space/space_2`, {
            headers: await roleHeaders(samlAuth, user),
          });

          expect(response).toHaveStatusCode(tests.exists.statusCode);
          await tests.exists.response(response, { esClient });
        }
      );

      apiTest(
        `should return ${tests.reservedSpace.statusCode} when the space is reserved ${scenario}`,
        async ({ apiClient, esClient, samlAuth }) => {
          const response = await apiClient.delete(`${urlPrefix}/api/spaces/space/default`, {
            headers: await roleHeaders(samlAuth, user),
          });

          expect(response).toHaveStatusCode(tests.reservedSpace.statusCode);
          await tests.reservedSpace.response(response, { esClient });
        }
      );

      apiTest(
        `should return ${tests.doesntExist.statusCode} when the space doesn't exist ${scenario}`,
        async ({ apiClient, esClient, samlAuth }) => {
          const response = await apiClient.delete(`${urlPrefix}/api/spaces/space/space_7`, {
            headers: await roleHeaders(samlAuth, user),
          });

          expect(response).toHaveStatusCode(tests.doesntExist.statusCode);
          await tests.doesntExist.response(response, { esClient });
        }
      );
    });
  });
};
