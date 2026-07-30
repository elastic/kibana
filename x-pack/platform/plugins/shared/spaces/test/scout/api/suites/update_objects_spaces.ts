/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { uniq, without } from 'lodash';

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { roleHeaders } from '../common/api_helpers';
import { loadEsArchive, unloadEsArchive } from '../common/es_archive';
import type { RoleName } from '../common/roles';
import { getUrlPrefix } from '../common/spaces';
import { SPACES_ES_ARCHIVE } from '../constants';
import { apiTest } from '../fixtures';

const TYPE = 'index-pattern';

export interface UpdateObjectsSpacesTestCase {
  objects: Array<{
    id: string;
    existingNamespaces: readonly string[];
    /**
     * If defined, asserts the total number of `legacy-url-alias` documents equals the
     * archive baseline ({@link ALIAS_COUNT_BASELINE}) plus this difference — aliases in a
     * space are deleted when the object they point to is unshared from that space.
     * Requires an `esClient` capable of searching the `.kibana*` system indices.
     */
    expectAliasDifference?: number;
    failure?: 404;
  }>;
  spacesToAdd: string[];
  spacesToRemove: string[];
}

/** Number of `legacy-url-alias` documents seeded by the shared spaces ES archive. */
const ALIAS_COUNT_BASELINE = 6;

export interface UpdateObjectsSpacesTestDefinition {
  title: string;
  responseStatusCode: 200 | 403;
  request: {
    objects: Array<{ type: string; id: string }>;
    spacesToAdd: string[];
    spacesToRemove: string[];
  };
  testCase: UpdateObjectsSpacesTestCase;
  authorizedSpace?: string;
}

interface UpdateTestOptions {
  user: RoleName;
  spaceId?: string;
  tests: UpdateObjectsSpacesTestDefinition[];
}

const createRequest = ({ objects, spacesToAdd, spacesToRemove }: UpdateObjectsSpacesTestCase) => ({
  objects: objects.map(({ id }) => ({ type: TYPE, id })),
  spacesToAdd,
  spacesToRemove,
});

const getTestTitle = ({ objects, spacesToAdd, spacesToRemove }: UpdateObjectsSpacesTestCase) => {
  const objStr = objects.map(({ id }) => id).join(',');
  const addStr = spacesToAdd.join(',');
  const remStr = spacesToRemove.join(',');
  return `{objects: [${objStr}], spacesToAdd: [${addStr}], spacesToRemove: [${remStr}]}`;
};

/**
 * Builds a request/response expectation for each test case, choosing 403 when `forbidden`
 * and 200 otherwise. When `authorizedSpace` is provided, the expected result namespaces are
 * redacted (`'?'`) for any space that is neither the authorized space nor `'*'`.
 */
export const createTestDefinitions = (
  testCases: UpdateObjectsSpacesTestCase | UpdateObjectsSpacesTestCase[],
  forbidden: boolean,
  options: { authorizedSpace?: string } = {}
): UpdateObjectsSpacesTestDefinition[] => {
  const cases = Array.isArray(testCases) ? testCases : [testCases];
  const responseStatusCode = forbidden ? 403 : 200;

  return cases.map((testCase) => ({
    title: getTestTitle(testCase),
    responseStatusCode,
    request: createRequest(testCase),
    testCase,
    authorizedSpace: options.authorizedSpace,
  }));
};

export const verifyResult = async (
  testCase: UpdateObjectsSpacesTestCase,
  statusCode: 200 | 403,
  authorizedSpace: string | undefined,
  response: ApiClientResponse,
  /** Required by test cases carrying `expectAliasDifference`; must be able to search `.kibana*`. */
  esClient?: Client
) => {
  if (statusCode === 403) {
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to share_to_space ${TYPE}`,
    });
    return;
  }

  const { objects, spacesToAdd, spacesToRemove } = testCase;
  const apiObjects = response.body.objects as Array<Record<string, any>>;

  let hasRefreshed = false;
  for (const [i, { id, existingNamespaces, expectAliasDifference, failure }] of objects.entries()) {
    const object = apiObjects[i];

    if (failure === 404) {
      expect(object.error).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [${TYPE}/${id}] not found`,
      });
      continue;
    }

    const expectedSpaces = without(
      uniq([...existingNamespaces, ...spacesToAdd]),
      ...spacesToRemove
    ).map((x) => (authorizedSpace && x !== authorizedSpace && x !== '*' ? '?' : x));

    expect(object.type).toBe(TYPE);
    expect(object.id).toBe(id);
    expect([...object.spaces].sort()).toStrictEqual([...expectedSpaces].sort());

    if (expectAliasDifference !== undefined) {
      if (!esClient) {
        throw new Error('esClient is required for test cases with `expectAliasDifference`');
      }
      if (!hasRefreshed) {
        // alias deletion uses `refresh: false`, so refresh the indices before searching
        await esClient.indices.refresh({ index: '.kibana*', ignore_unavailable: true });
        hasRefreshed = true;
      }
      const searchResponse = await esClient.search({
        index: '.kibana*',
        ignore_unavailable: true,
        size: 0,
        query: { terms: { type: ['legacy-url-alias'] } },
        track_total_hits: true,
      });
      expect((searchResponse.hits.total as SearchTotalHits).value).toBe(
        ALIAS_COUNT_BASELINE + expectAliasDifference
      );
    }
  }
};

/**
 * Logs in an interactive user scoped to the role's privileges (cookie session), loads the
 * shared spaces ES archive fresh for the describe block and issues
 * `POST /api/spaces/_update_objects_spaces` from the target space's URL context for each
 * test case, asserting the response (and redacted `spaces`) match expectations.
 *
 * Note: the authorization matrices don't use `expectAliasDifference`; the alias-deletion and
 * share-lifecycle behavior is covered by `tests/update_objects_spaces_lifecycle.spec.ts`.
 */
export const updateTest = (
  description: string,
  { user, spaceId = 'default', tests }: UpdateTestOptions
) => {
  apiTest.describe(description, () => {
    apiTest.beforeAll(async ({ config }) => {
      await loadEsArchive(config.hosts.elasticsearch, SPACES_ES_ARCHIVE);
    });

    apiTest.afterAll(async ({ config }) => {
      await unloadEsArchive(config.hosts.elasticsearch, SPACES_ES_ARCHIVE);
    });

    for (const test of tests) {
      apiTest(
        `should return ${test.responseStatusCode} ${test.title}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.post(
            `${getUrlPrefix(spaceId)}/api/spaces/_update_objects_spaces`,
            { headers: await roleHeaders(samlAuth, user), body: test.request }
          );

          expect(response).toHaveStatusCode(test.responseStatusCode);
          await verifyResult(
            test.testCase,
            test.responseStatusCode,
            test.authorizedSpace,
            response
          );
        }
      );
    }
  });
};
