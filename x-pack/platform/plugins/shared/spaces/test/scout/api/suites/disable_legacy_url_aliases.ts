/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { roleHeaders } from '../common/api_helpers';
import { getSystemIndicesClient, loadEsArchive, unloadEsArchive } from '../common/es_archive';
import type { RoleName } from '../common/roles';
import { getUrlPrefix } from '../common/spaces';
import { SPACES_ES_ARCHIVE } from '../constants';
import { apiTest } from '../fixtures';

const MAIN_SAVED_OBJECT_INDEX = '.kibana';
const LEGACY_URL_ALIAS_TYPE = 'legacy-url-alias';

export const TEST_CASE_TARGET_TYPE = 'index-pattern';
// Two aliases exist for `space_1_only`: one in the default space, and one in space_2.
export const TEST_CASE_SOURCE_ID = 'space_1_only';

export interface DisableLegacyUrlAliasesTestCase {
  targetSpace: string;
  targetType: string;
  sourceId: string;
  expectFound: boolean;
}

export interface DisableLegacyUrlAliasesTestDefinition {
  title: string;
  responseStatusCode: 204 | 403;
  request: { aliases: Array<{ targetSpace: string; targetType: string; sourceId: string }> };
  testCase: DisableLegacyUrlAliasesTestCase;
}

interface DisableTestOptions {
  user: RoleName;
  spaceId?: string;
  tests: DisableLegacyUrlAliasesTestDefinition[];
}

const getTestTitle = ({ targetSpace, targetType, sourceId }: DisableLegacyUrlAliasesTestCase) =>
  `for alias '${targetSpace}:${targetType}:${sourceId}'`;

/**
 * Builds a request/response expectation for each test case, choosing 403 when `forbidden`
 * is set and 204 otherwise.
 */
export const createTestDefinitions = (
  testCases: DisableLegacyUrlAliasesTestCase | DisableLegacyUrlAliasesTestCase[],
  forbidden: boolean
): DisableLegacyUrlAliasesTestDefinition[] => {
  const cases = Array.isArray(testCases) ? testCases : [testCases];
  const responseStatusCode = forbidden ? 403 : 204;

  return cases.map((testCase) => ({
    title: getTestTitle(testCase),
    responseStatusCode,
    request: {
      aliases: [
        {
          targetSpace: testCase.targetSpace,
          targetType: testCase.targetType,
          sourceId: testCase.sourceId,
        },
      ],
    },
    testCase,
  }));
};

/**
 * Verifies the response and the resulting ES state for a single alias: on 403 the error
 * body is asserted, then the alias document is inspected directly in Elasticsearch to
 * confirm whether it exists and whether it was disabled (only a 204 should flip `disabled`
 * to `true`).
 */
const verifyResult = async (
  esClient: Client,
  testCase: DisableLegacyUrlAliasesTestCase,
  statusCode: 204 | 403,
  response: ApiClientResponse
) => {
  const { targetSpace, targetType, sourceId, expectFound } = testCase;

  if (statusCode === 403) {
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to disable aliases: Unable to bulk_update ${targetType}`,
    });
  }

  // the `.kibana*` indices are restricted, so the alias doc must be read with the
  // system-indices-capable client
  const esResponse = await esClient.get<Record<string, any>>(
    {
      index: MAIN_SAVED_OBJECT_INDEX,
      id: `${LEGACY_URL_ALIAS_TYPE}:${targetSpace}:${targetType}:${sourceId}`,
    },
    { ignore: [404] }
  );

  if (expectFound) {
    expect(esResponse.found).toBe(true);
    const doc = esResponse._source ?? {};
    expect(doc[LEGACY_URL_ALIAS_TYPE].disabled).toBe(statusCode === 204 ? true : undefined);
  } else {
    expect(esResponse.found).toBe(false);
  }
};

/**
 * Logs in an interactive user scoped to the role's privileges (cookie session), loads
 * the shared spaces ES archive fresh for the describe block (so mutations from a prior
 * block don't leak) and issues `POST /api/spaces/_disable_legacy_url_aliases` from the
 * target space's URL context for each test case.
 */
export const disableTest = (
  description: string,
  { user, spaceId = 'default', tests }: DisableTestOptions
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
        async ({ apiClient, samlAuth, config }) => {
          const response = await apiClient.post(
            `${getUrlPrefix(spaceId)}/api/spaces/_disable_legacy_url_aliases`,
            { headers: await roleHeaders(samlAuth, user), body: test.request }
          );

          expect(response).toHaveStatusCode(test.responseStatusCode);
          await verifyResult(
            getSystemIndicesClient(config.hosts.elasticsearch),
            test.testCase,
            test.responseStatusCode,
            response
          );
        }
      );
    }
  });
};
