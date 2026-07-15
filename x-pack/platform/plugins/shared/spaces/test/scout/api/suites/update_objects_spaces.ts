/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, without } from 'lodash';

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
    failure?: 404;
  }>;
  spacesToAdd: string[];
  spacesToRemove: string[];
}

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

const verifyResult = (
  testCase: UpdateObjectsSpacesTestCase,
  statusCode: 200 | 403,
  authorizedSpace: string | undefined,
  response: { body: Record<string, any> }
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

  objects.forEach(({ id, existingNamespaces, failure }, i) => {
    const object = apiObjects[i];

    if (failure === 404) {
      expect(object.error).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [${TYPE}/${id}] not found`,
      });
      return;
    }

    const expectedSpaces = without(
      uniq([...existingNamespaces, ...spacesToAdd]),
      ...spacesToRemove
    ).map((x) => (authorizedSpace && x !== authorizedSpace && x !== '*' ? '?' : x));

    expect(object.type).toBe(TYPE);
    expect(object.id).toBe(id);
    expect([...object.spaces].sort()).toStrictEqual([...expectedSpaces].sort());
  });
};

/**
 * Logs in an interactive user scoped to the role's privileges (cookie session), loads the
 * shared spaces ES archive fresh for the describe block and issues
 * `POST /api/spaces/_update_objects_spaces` from the target space's URL context for each
 * test case, asserting the response (and redacted `spaces`) match expectations.
 *
 * Note: the alias-deletion cases are intentionally excluded, so no `expectAliasDifference` /
 * ES alias-count assertions are included.
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
          verifyResult(test.testCase, test.responseStatusCode, test.authorizedSpace, response);
        }
      );
    }
  });
};
