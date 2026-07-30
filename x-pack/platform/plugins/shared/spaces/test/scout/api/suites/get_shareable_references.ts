/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { roleHeaders } from '../common/api_helpers';
import type { RoleName } from '../common/roles';
import { getUrlPrefix } from '../common/spaces';
import { apiTest } from '../fixtures';

export interface ReferenceResult {
  type: string;
  id: string;
  spaces: string[];
  inboundReferences: Array<{ type: string; id: string; name: string }>;
  isMissing?: boolean;
  spacesWithMatchingAliases?: string[];
  spacesWithMatchingOrigins?: string[];
}

export interface GetShareableReferencesTestCase {
  objects: Array<{ type: string; id: string }>;
  expectedResults: ReferenceResult[];
}

export interface GetShareableReferencesTestDefinition {
  title: string;
  responseStatusCode: 200 | 403;
  request: { objects: Array<{ type: string; id: string }> };
  testCase: GetShareableReferencesTestCase;
  authorizedSpace?: string;
}

interface ShareableReferencesTestOptions {
  user: RoleName;
  spaceId?: string;
  tests: GetShareableReferencesTestDefinition[];
}

const getTestTitle = ({ objects }: GetShareableReferencesTestCase) =>
  `{objects: [${objects.map(({ type, id }) => `${type}:${id}`).join(',')}]}`;

/**
 * When `authorizedSpace` is undefined nothing is redacted (spaces are simply sorted);
 * otherwise every space that is neither the authorized space nor `'*'` is replaced with
 * `'?'` and the unknown entries are sorted to the end.
 */
const getRedactedSpaces = (authorizedSpace: string | undefined, spaces: string[]) => {
  if (!authorizedSpace) {
    return [...spaces].sort();
  }
  const redactedSpaces = spaces.map((x) => (x !== authorizedSpace && x !== '*' ? '?' : x));
  return redactedSpaces.sort((a, b) => (a === '?' ? 1 : b === '?' ? -1 : 0));
};

export const createTestDefinitions = (
  testCases: GetShareableReferencesTestCase | GetShareableReferencesTestCase[],
  forbidden: boolean,
  options: { authorizedSpace?: string } = {}
): GetShareableReferencesTestDefinition[] => {
  const cases = Array.isArray(testCases) ? testCases : [testCases];
  const responseStatusCode = forbidden ? 403 : 200;

  return cases.map((testCase) => ({
    title: getTestTitle(testCase),
    responseStatusCode,
    request: { objects: testCase.objects },
    testCase,
    authorizedSpace: options.authorizedSpace,
  }));
};

const uniqSortedTypes = (objects: Array<{ type: string }>) =>
  Array.from(new Set(objects.map((x) => x.type)))
    .sort()
    .join();

const verifyResult = (
  testCase: GetShareableReferencesTestCase,
  statusCode: 200 | 403,
  authorizedSpace: string | undefined,
  response: ApiClientResponse
) => {
  if (statusCode === 403) {
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to share_to_space ${uniqSortedTypes(testCase.objects)}`,
    });
    return;
  }

  const apiObjects = response.body.objects as ReferenceResult[];
  expect(apiObjects).toHaveLength(testCase.expectedResults.length);

  testCase.expectedResults.forEach((expectedResult, i) => {
    const { spaces, spacesWithMatchingAliases, spacesWithMatchingOrigins } = expectedResult;
    const expected: ReferenceResult = {
      ...expectedResult,
      spaces: getRedactedSpaces(authorizedSpace, spaces),
      ...(spacesWithMatchingAliases && {
        spacesWithMatchingAliases: getRedactedSpaces(authorizedSpace, spacesWithMatchingAliases),
      }),
      ...(spacesWithMatchingOrigins && {
        spacesWithMatchingOrigins: getRedactedSpaces(authorizedSpace, spacesWithMatchingOrigins),
      }),
    };

    expect(apiObjects[i]).toStrictEqual(expected);
  });
};

/**
 * Logs in an interactive user scoped to the role's privileges (cookie session) and issues
 * `POST /api/spaces/_get_shareable_references` from the target space's URL context, asserting
 * the (optionally redacted) reference graph matches expectations.
 *
 * The endpoint is read-only, so the shared spaces ES archive is loaded ONCE by the consuming
 * spec's top-level `beforeAll` (see `get_shareable_references.spec.ts`) rather than reloaded
 * per describe block like the mutating share suites.
 */
export const shareableReferencesTest = (
  description: string,
  { user, spaceId = 'default', tests }: ShareableReferencesTestOptions
) => {
  apiTest.describe(description, () => {
    for (const test of tests) {
      apiTest(
        `should return ${test.responseStatusCode} ${test.title}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.post(
            `${getUrlPrefix(spaceId)}/api/spaces/_get_shareable_references`,
            { headers: await roleHeaders(samlAuth, user), body: test.request }
          );

          expect(response).toHaveStatusCode(test.responseStatusCode);
          verifyResult(test.testCase, test.responseStatusCode, test.authorizedSpace, response);
        }
      );
    }
  });
};
