/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { createExpectRbacForbidden, roleHeaders } from '../common/api_helpers';
import type { RoleName } from '../common/roles';
import { getTestScenariosForSpace, SOLUTION_ES_DISABLED_FEATURES } from '../common/spaces';
import { apiTest } from '../fixtures';

interface CreateTest {
  statusCode: number;
  response: (resp: ApiClientResponse) => void;
}

export interface CreateTests {
  newSpace: CreateTest;
  alreadyExists: CreateTest;
  reservedSpecified: CreateTest;
  solutionSpecified: CreateTest;
}

interface CreateTestDefinition {
  user: RoleName;
  spaceId: string;
  tests: CreateTests;
}

export const expectConflictResponse = (resp: ApiClientResponse) => {
  expect(Object.keys(resp.body).sort()).toStrictEqual(['error', 'message', 'statusCode']);
  expect(resp.body.error).toBe('Conflict');
  expect(resp.body.statusCode).toBe(409);
  expect(resp.body.message).toMatch(/A space with the identifier .*/);
};

export const expectNewSpaceResult = (resp: ApiClientResponse) => {
  expect(resp.body).toStrictEqual({
    name: 'marketing',
    id: 'marketing',
    description: 'a description',
    color: '#5c5959',
    disabledFeatures: [],
  });
};

export const expectRbacForbiddenResponse = createExpectRbacForbidden(
  'Unauthorized to create spaces'
);

export const expectReservedSpecifiedResult = (resp: ApiClientResponse) => {
  expect(resp.body).toStrictEqual({
    name: 'reserved space',
    id: 'reserved',
    description: 'a description',
    color: '#5c5959',
    disabledFeatures: [],
  });
};

export const expectSolutionSpecifiedResult = (resp: ApiClientResponse) => {
  const disabledFeatures = [...resp.body.disabledFeatures].sort();

  expect({ ...resp.body, disabledFeatures }).toStrictEqual({
    id: 'solution',
    name: 'space with solution',
    description: 'a description',
    color: '#5c5959',
    // Disabled features are automatically added to the space when a solution is set
    disabledFeatures: [...SOLUTION_ES_DISABLED_FEATURES],
    solution: 'es',
  });
};

/**
 * For each matrix entry it logs in an interactive user scoped to the role's
 * privileges (cookie session) and exercises the create endpoint against every URL
 * scenario for the target space.
 *
 * A cookie session backed by a real custom role is used rather than an inline
 * `kibana_role_descriptors` API key: an API key created with empty Kibana
 * privileges (e.g. `no_access`) inherits the admin creator's privileges instead
 * of being unauthorized, which would defeat the purpose of the matrix. The Scout
 * runner executes serially (`workers: 1`, `fullyParallel: false`), so the single
 * per-worker custom-role slot used by `asInteractiveUser` is safe here.
 */
export const createTest = (description: string, { user, spaceId, tests }: CreateTestDefinition) => {
  apiTest.describe(description, () => {
    apiTest.afterEach(async ({ apiServices }) => {
      // Delete any transient space a scenario may have created, unconditionally: an inline
      // cleanup gated on the response status would be skipped when a status assertion throws
      // first (e.g. an unexpected 200 in a forbidden scenario) or the test crashes mid-way,
      // leaking the space and cascading 409s into every later matrix entry. The delete
      // tolerates 404s, so this is a no-op for scenarios that created nothing.
      for (const id of ['marketing', 'reserved', 'solution']) {
        await apiServices.spaces.delete(id);
      }
    });

    getTestScenariosForSpace(spaceId).forEach(({ urlPrefix, scenario }) => {
      apiTest(
        `should return ${tests.newSpace.statusCode} ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.post(`${urlPrefix}/api/spaces/space`, {
            headers: await roleHeaders(samlAuth, user),
            body: {
              name: 'marketing',
              id: 'marketing',
              description: 'a description',
              color: '#5c5959',
              disabledFeatures: [],
            },
          });

          expect(response).toHaveStatusCode(tests.newSpace.statusCode);
          tests.newSpace.response(response);
        }
      );

      apiTest(
        `should return ${tests.alreadyExists.statusCode} when it already exists ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.post(`${urlPrefix}/api/spaces/space`, {
            headers: await roleHeaders(samlAuth, user),
            body: {
              name: 'space_1',
              id: 'space_1',
              color: '#ffffff',
              description: 'a description',
              disabledFeatures: [],
            },
          });

          expect(response).toHaveStatusCode(tests.alreadyExists.statusCode);
          tests.alreadyExists.response(response);
        }
      );

      apiTest(
        `should return ${tests.reservedSpecified.statusCode} and ignore _reserved ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.post(`${urlPrefix}/api/spaces/space`, {
            headers: await roleHeaders(samlAuth, user),
            body: {
              name: 'reserved space',
              id: 'reserved',
              description: 'a description',
              color: '#5c5959',
              _reserved: true,
              disabledFeatures: [],
            },
          });

          expect(response).toHaveStatusCode(tests.reservedSpecified.statusCode);
          tests.reservedSpecified.response(response);
        }
      );

      apiTest(
        `should return ${tests.solutionSpecified.statusCode} when solution is specified ${scenario}`,
        async ({ apiClient, config, samlAuth }) => {
          const isServerless = config.serverless;
          const expectedStatusCode = isServerless ? 400 : tests.solutionSpecified.statusCode;

          const response = await apiClient.post(`${urlPrefix}/api/spaces/space`, {
            headers: await roleHeaders(samlAuth, user),
            body: {
              name: 'space with solution',
              id: 'solution',
              description: 'a description',
              color: '#5c5959',
              solution: 'es',
              disabledFeatures: [],
            },
          });

          expect(response).toHaveStatusCode(expectedStatusCode);
          if (!isServerless) {
            tests.solutionSpecified.response(response);
          }
        }
      );
    });
  });
};
