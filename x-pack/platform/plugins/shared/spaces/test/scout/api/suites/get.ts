/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  expectNotFound,
  createExpectRbacForbidden as rbacForbidden,
  roleHeaders,
} from '../common/api_helpers';
import type { RoleName } from '../common/roles';
import { getTestScenariosForSpace, SOLUTION_ES_DISABLED_FEATURES } from '../common/spaces';
import { apiTest } from '../fixtures';

interface GetTest {
  statusCode: number;
  response: (resp: ApiClientResponse) => void;
}

export interface GetTests {
  default: GetTest;
}

interface GetTestDefinition {
  user: RoleName;
  currentSpaceId: string;
  spaceId: string;
  tests: GetTests;
}

export const NON_EXISTENT_SPACE_ID = 'not-a-space';

// Canonical GET responses for the baseline spaces provisioned by `createTestSpaces`.
// `space_3` is created with the `es` solution on stateful deployments, so Kibana
// auto-populates its `disabledFeatures`.
const EXPECTED_SPACES: Record<string, Record<string, any>> = {
  default: {
    id: 'default',
    name: 'Default',
    color: '#00bfb3',
    description: 'This is your default space!',
    _reserved: true,
    disabledFeatures: [],
  },
  space_1: {
    id: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
    disabledFeatures: [],
  },
  space_3: {
    id: 'space_3',
    name: 'Space 3',
    description: 'This is the third test space',
    solution: 'es',
    disabledFeatures: [...SOLUTION_ES_DISABLED_FEATURES],
  },
};

export const createExpectResults = (spaceId: string) => (resp: ApiClientResponse) => {
  const expectedSpace = EXPECTED_SPACES[spaceId];
  const disabledFeatures = [...(resp.body.disabledFeatures ?? [])].sort();

  expect({ ...resp.body, disabledFeatures }).toStrictEqual({
    ...expectedSpace,
    disabledFeatures: [...expectedSpace.disabledFeatures].sort(),
  });
};

export const createExpectRbacForbidden = (spaceId: string) =>
  rbacForbidden(`Unauthorized to get ${spaceId} space`);

export { expectNotFound as expectNotFoundResult };

/**
 * For each matrix entry it logs in an interactive user scoped to the role's
 * privileges (cookie session) and issues a `GET /api/spaces/space/{id}` from the
 * `currentSpaceId` URL context for every URL scenario.
 */
export const getTest = (
  description: string,
  { user, currentSpaceId, spaceId, tests }: GetTestDefinition
) => {
  apiTest.describe(description, () => {
    getTestScenariosForSpace(currentSpaceId).forEach(({ urlPrefix, scenario }) => {
      apiTest(
        `should return ${tests.default.statusCode} ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.get(`${urlPrefix}/api/spaces/space/${spaceId}`, {
            headers: await roleHeaders(samlAuth, user),
          });

          expect(response).toHaveStatusCode(tests.default.statusCode);
          tests.default.response(response);
        }
      );
    });
  });
};
