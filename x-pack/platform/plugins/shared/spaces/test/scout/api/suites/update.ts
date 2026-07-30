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
import { getUrlPrefix } from '../common/spaces';
import { apiTest } from '../fixtures';

interface UpdateTest {
  statusCode: number;
  response: (resp: ApiClientResponse) => void;
}

export interface UpdateTests {
  alreadyExists: UpdateTest;
  defaultSpace: UpdateTest;
  newSpace: UpdateTest;
}

interface UpdateTestDefinition {
  user: RoleName;
  spaceId: string;
  tests: UpdateTests;
}

export const expectRbacForbidden = createExpectRbacForbidden('Unauthorized to update spaces');

export { expectNotFound } from '../common/api_helpers';

export const expectDefaultSpaceResult = (resp: ApiClientResponse) => {
  expect(resp.body).toStrictEqual({
    name: 'the new default',
    id: 'default',
    description: 'a description',
    color: '#ffffff',
    disabledFeatures: [],
    _reserved: true,
  });
};

export const expectAlreadyExistsResult = (resp: ApiClientResponse) => {
  expect(resp.body).toStrictEqual({
    name: 'space 1',
    id: 'space_1',
    description: 'a description',
    color: '#5c5959',
    disabledFeatures: [],
  });
};

/**
 * Exercises `PUT /api/spaces/space/{id}` from the target space's URL context for
 * an existing space (`space_1`), the reserved default space, and a non-existent
 * space (`marketing`). Uses a cookie session scoped to the role's privileges.
 */
export const updateTest = (description: string, { user, spaceId, tests }: UpdateTestDefinition) => {
  apiTest.describe(description, () => {
    const urlPrefix = getUrlPrefix(spaceId);

    apiTest(
      `should return ${tests.alreadyExists.statusCode} when updating space_1`,
      async ({ apiClient, samlAuth }) => {
        const response = await apiClient.put(`${urlPrefix}/api/spaces/space/space_1`, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            name: 'space 1',
            id: 'space_1',
            description: 'a description',
            color: '#5c5959',
            _reserved: true,
            disabledFeatures: [],
          },
        });

        expect(response).toHaveStatusCode(tests.alreadyExists.statusCode);
        tests.alreadyExists.response(response);
      }
    );

    apiTest(
      `should return ${tests.defaultSpace.statusCode} when updating the default space`,
      async ({ apiClient, samlAuth }) => {
        const response = await apiClient.put(`${urlPrefix}/api/spaces/space/default`, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            name: 'the new default',
            id: 'default',
            description: 'a description',
            color: '#ffffff',
            _reserved: false,
            disabledFeatures: [],
          },
        });

        expect(response).toHaveStatusCode(tests.defaultSpace.statusCode);
        tests.defaultSpace.response(response);
      }
    );

    apiTest(
      `should return ${tests.newSpace.statusCode} when the space doesn't exist`,
      async ({ apiClient, samlAuth }) => {
        const response = await apiClient.put(`${urlPrefix}/api/spaces/space/marketing`, {
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
  });
};
