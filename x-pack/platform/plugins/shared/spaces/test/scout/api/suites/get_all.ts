/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { createExpectRbacForbidden, type MatrixUser, roleHeaders } from '../common/api_helpers';
import { getTestScenariosForSpace, SOLUTION_ES_DISABLED_FEATURES } from '../common/spaces';
import { apiTest } from '../fixtures';

interface GetAllTest {
  statusCode: number;
  response: (resp: ApiClientResponse) => void;
}

export interface GetAllTests {
  exists: GetAllTest;
  copySavedObjectsPurpose: GetAllTest;
  shareSavedObjectsPurpose: GetAllTest;
  includeAuthorizedPurposes: GetAllTest;
}

interface GetAllTestDefinition {
  user: MatrixUser;
  spaceId: string;
  tests: GetAllTests;
}

interface AuthorizedPurposes {
  any: boolean;
  copySavedObjectsIntoSpace: boolean;
  findSavedObjects: boolean;
  shareSavedObjectsIntoSpace: boolean;
}

interface Space {
  id: string;
  name: string;
  color?: string;
  description: string;
  solution?: string;
  _reserved?: boolean;
  disabledFeatures: string[];
}

interface SpaceResult extends Space {
  authorizedPurposes?: AuthorizedPurposes;
}

// Canonical spaces provisioned by `createTestSpaces`. `space_3` is created with the
// `es` solution on stateful deployments, so Kibana auto-populates its `disabledFeatures`,
// using the empirically validated `SOLUTION_ES_DISABLED_FEATURES` for the solution space.
const ALL_SPACE_RESULTS: Space[] = [
  {
    id: 'default',
    name: 'Default',
    color: '#00bfb3',
    description: 'This is your default space!',
    disabledFeatures: [],
    _reserved: true,
  },
  {
    id: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
    disabledFeatures: [],
  },
  {
    id: 'space_2',
    name: 'Space 2',
    description: 'This is the second test space',
    disabledFeatures: [],
  },
  {
    id: 'space_3',
    name: 'Space 3',
    description: 'This is the third test space',
    disabledFeatures: [...SOLUTION_ES_DISABLED_FEATURES],
    solution: 'es',
  },
];

const sortDisabled = (space?: { disabledFeatures?: string[] }) =>
  [...(space?.disabledFeatures ?? [])].sort();

const findExpectedSpace = (spaceIds: string[], id: string) =>
  spaceIds.includes(id) ? ALL_SPACE_RESULTS.find((entry) => entry.id === id) : undefined;

/**
 * Asserts that every space returned by the API matches its canonical definition (it does
 * not assert the full set or ordering). Both `actual` and `expected` are built from
 * `resp.body` in the same order, so a single `toStrictEqual` per response is order-safe.
 *
 * NOTE: the helper bodies deliberately use `for` loops rather than `.map`/inline
 * arrow callbacks. `eslint-plugin-playwright`'s `no-standalone-expect` rule pops its
 * internal "arrow" marker on every arrow-function exit, so an inline arrow inside a
 * curried helper corrupts its call-stack tracking and falsely flags the trailing
 * `expect` as standalone.
 */
const buildExpectResults =
  (authorizedPurposes: AuthorizedPurposes | undefined, spaceIds: string[]) =>
  (resp: ApiClientResponse) => {
    const spaces = resp.body as SpaceResult[];
    const actual: unknown[] = [];
    const expected: unknown[] = [];

    for (const space of spaces) {
      const expectedSpace = findExpectedSpace(spaceIds, space.id);
      actual.push({
        name: space.name,
        description: space.description,
        color: space.color,
        solution: space.solution,
        disabledFeatures: sortDisabled(space),
        ...(authorizedPurposes ? { authorizedPurposes: space.authorizedPurposes } : {}),
      });
      expected.push({
        name: expectedSpace?.name,
        description: expectedSpace?.description,
        color: expectedSpace?.color,
        solution: expectedSpace?.solution,
        disabledFeatures: sortDisabled(expectedSpace),
        ...(authorizedPurposes
          ? { authorizedPurposes: expectedSpace ? authorizedPurposes : undefined }
          : {}),
      });
    }

    // The loop above only inspects returned entries, so an authorized space that the
    // API silently omits would otherwise go undetected. Assert every expected space id
    // is present without asserting the exact set (extra spaces still fail via the
    // all-undefined `expected` entry produced by `findExpectedSpace`).
    const returnedIds: string[] = [];
    for (const space of spaces) {
      returnedIds.push(space.id);
    }
    for (const id of spaceIds) {
      expect(returnedIds).toContain(id);
    }

    expect(actual).toStrictEqual(expected);
  };

export const createExpectResults = (...spaceIds: string[]) =>
  buildExpectResults(undefined, spaceIds);

export const createExpectAllPurposesResults = (
  authorizedPurposes: AuthorizedPurposes,
  ...spaceIds: string[]
) => buildExpectResults(authorizedPurposes, spaceIds);

export const expectRbacForbidden = createExpectRbacForbidden('Forbidden');

/**
 * For each matrix entry it logs in an interactive user scoped to the role's
 * privileges (cookie session) and issues four `GET /api/spaces/space` variants
 * (undefined purpose, `copySavedObjectsIntoSpace`, `shareSavedObjectsIntoSpace`
 * and `include_authorized_purposes=true`) from the target space's URL context for
 * every URL scenario.
 *
 * The assertions here only inspect the returned space list and each space's
 * `authorizedPurposes` (which derive from the user's privileges, not from existing
 * objects), so no saved-object archives are loaded.
 */
export const getAllTest = (description: string, { user, spaceId, tests }: GetAllTestDefinition) => {
  apiTest.describe(description, () => {
    getTestScenariosForSpace(spaceId).forEach(({ urlPrefix, scenario }) => {
      apiTest(
        `undefined purpose should return ${tests.exists.statusCode} ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.get(`${urlPrefix}/api/spaces/space`, {
            headers: await roleHeaders(samlAuth, user),
          });

          expect(response).toHaveStatusCode(tests.exists.statusCode);
          tests.exists.response(response);
        }
      );

      apiTest(
        `copySavedObjectsIntoSpace purpose should return ${tests.copySavedObjectsPurpose.statusCode} ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.get(
            `${urlPrefix}/api/spaces/space?purpose=copySavedObjectsIntoSpace`,
            { headers: await roleHeaders(samlAuth, user) }
          );

          expect(response).toHaveStatusCode(tests.copySavedObjectsPurpose.statusCode);
          tests.copySavedObjectsPurpose.response(response);
        }
      );

      apiTest(
        `shareSavedObjectsIntoSpace purpose should return ${tests.shareSavedObjectsPurpose.statusCode} ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.get(
            `${urlPrefix}/api/spaces/space?purpose=shareSavedObjectsIntoSpace`,
            { headers: await roleHeaders(samlAuth, user) }
          );

          expect(response).toHaveStatusCode(tests.shareSavedObjectsPurpose.statusCode);
          tests.shareSavedObjectsPurpose.response(response);
        }
      );

      apiTest(
        `include_authorized_purposes=true should return ${tests.includeAuthorizedPurposes.statusCode} ${scenario}`,
        async ({ apiClient, samlAuth }) => {
          const response = await apiClient.get(
            `${urlPrefix}/api/spaces/space?include_authorized_purposes=true`,
            { headers: await roleHeaders(samlAuth, user) }
          );

          expect(response).toHaveStatusCode(tests.includeAuthorizedPurposes.statusCode);
          tests.includeAuthorizedPurposes.response(response);
        }
      );
    });
  });
};
