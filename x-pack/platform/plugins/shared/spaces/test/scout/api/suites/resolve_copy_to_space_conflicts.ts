/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientResponse, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { createExpectRbacForbidden, roleHeaders } from '../common/api_helpers';
import {
  createCopySavedObjects,
  createCopySpaces,
  deleteCopySavedObjects,
  deleteCopySpaces,
} from '../common/copy_to_space_data';
import type { RoleName } from '../common/roles';
import { getUrlPrefix } from '../common/spaces';
import { apiTest } from '../fixtures';

const DEFAULT_SPACE_ID = 'default';
export const NON_EXISTENT_SPACE_ID = 'non_existent_space';

export interface ResolveResponseContext {
  kbnClient: KbnClient;
}

export type ResolveResponseFn = (
  resp: ApiClientResponse,
  ctx: ResolveResponseContext
) => Promise<void>;

interface ResolveCopyToSpaceTest {
  statusCode: number;
  response: ResolveResponseFn;
}

export interface ResolveCopyToSpaceMultiNamespaceTest {
  testTitle: string;
  objects: Array<Record<string, any>>;
  retries: Record<string, any>;
  statusCode: number;
  response: ResolveResponseFn;
}

export interface ResolveCopyToSpaceTests {
  withReferencesNotOverwriting: ResolveCopyToSpaceTest;
  withReferencesOverwriting: ResolveCopyToSpaceTest;
  withoutReferencesOverwriting: ResolveCopyToSpaceTest;
  withoutReferencesNotOverwriting: ResolveCopyToSpaceTest;
  nonExistentSpace: ResolveCopyToSpaceTest;
}

export type ResolveMultiNamespaceOutcome =
  | 'authorized'
  | 'unauthorizedRead'
  | 'unauthorizedWrite'
  | 'noAccess';

interface ResolveCopyToSpaceTestDefinition {
  user: RoleName;
  spaceId?: string;
  tests: ResolveCopyToSpaceTests;
}

const getDestinationSpace = (originSpaceId?: string) =>
  !originSpaceId || originSpaceId === DEFAULT_SPACE_ID ? 'space_1' : DEFAULT_SPACE_ID;

/**
 * Reads a saved object (as the privileged `kbnClient`) from the given space, returning the
 * response body. For missing objects the body is the `{ statusCode: 404, ... }` error.
 */
interface SavedObjectResult {
  attributes?: { title?: string };
  statusCode?: number;
}

const getSavedObject = async (kbnClient: KbnClient, spaceId: string, type: string, id: string) => {
  const { data } = await kbnClient.request<SavedObjectResult>({
    method: 'GET',
    path: `${getUrlPrefix(spaceId)}/api/saved_objects/${type}/${id}`,
    ignoreErrors: [404],
  });
  return data;
};

const getObjectsAtSpace = async (kbnClient: KbnClient, spaceId: string) => {
  // The two reads are independent; run them concurrently (called by nearly every
  // resolve assertion).
  const [dashboard, visualization] = await Promise.all([
    getSavedObject(kbnClient, spaceId, 'dashboard', `cts_dashboard_${spaceId}`),
    getSavedObject(kbnClient, spaceId, 'visualization', `cts_vis_3_${spaceId}`),
  ]);
  return [dashboard, visualization] as const;
};

const expectRouteForbiddenBody = createExpectRbacForbidden(
  'API [POST /api/spaces/_resolve_copy_saved_objects_errors] is unauthorized for user, this action is granted by the Kibana privileges [copySavedObjectsToSpaces]'
);

export const expectRouteForbiddenResponse: ResolveResponseFn = async (resp) => {
  expectRouteForbiddenBody(resp);
};

export const createExpectOverriddenResponseWithReferences =
  (sourceSpaceId: string): ResolveResponseFn =>
  async (resp, { kbnClient }) => {
    const destination = getDestinationSpace(sourceSpaceId);
    expect(resp.body).toStrictEqual({
      [destination]: {
        success: true,
        successCount: 2,
        successResults: [
          {
            id: `cts_ip_1_${sourceSpaceId}`,
            type: 'index-pattern',
            meta: {
              title: `Copy to Space index pattern 1 from ${sourceSpaceId} space`,
              icon: 'indexPatternApp',
            },
            destinationId: `cts_ip_1_${destination}`,
            overwrite: true,
            managed: false,
          },
          {
            id: `cts_vis_3_${sourceSpaceId}`,
            type: 'visualization',
            meta: { title: `CTS vis 3 from ${sourceSpaceId} space`, icon: 'visualizeApp' },
            destinationId: `cts_vis_3_${destination}`,
            overwrite: true,
            managed: false,
          },
        ],
      },
    });
    const [dashboard, visualization] = await getObjectsAtSpace(kbnClient, destination);
    expect(dashboard.attributes?.title).toBe(`This is the ${destination} test space CTS dashboard`);
    expect(visualization.attributes?.title).toBe(`CTS vis 3 from ${sourceSpaceId} space`);
  };

export const createExpectOverriddenResponseWithoutReferences =
  (
    sourceSpaceId: string,
    destinationSpaceId: string = getDestinationSpace(sourceSpaceId)
  ): ResolveResponseFn =>
  async (resp, { kbnClient }) => {
    expect(resp.body).toStrictEqual({
      [destinationSpaceId]: {
        success: true,
        successCount: 1,
        successResults: [
          {
            id: `cts_dashboard_${sourceSpaceId}`,
            type: 'dashboard',
            meta: {
              title: `This is the ${sourceSpaceId} test space CTS dashboard`,
              icon: 'dashboardApp',
            },
            destinationId: `cts_dashboard_${destinationSpaceId}`,
            overwrite: true,
            managed: false,
          },
        ],
      },
    });
    const [dashboard, visualization] = await getObjectsAtSpace(kbnClient, destinationSpaceId);
    expect(dashboard.attributes?.title).toBe(
      `This is the ${sourceSpaceId} test space CTS dashboard`
    );
    if (destinationSpaceId === NON_EXISTENT_SPACE_ID) {
      expect(visualization.statusCode).toBe(404);
    } else {
      expect(visualization.attributes?.title).toBe(`CTS vis 3 from ${destinationSpaceId} space`);
    }
  };

export const createExpectNonOverriddenResponseWithReferences =
  (sourceSpaceId: string): ResolveResponseFn =>
  async (resp, { kbnClient }) => {
    const destination = getDestinationSpace(sourceSpaceId);
    expect(resp.body).toStrictEqual({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            error: { type: 'conflict', destinationId: `cts_ip_1_${destination}` },
            id: `cts_ip_1_${sourceSpaceId}`,
            meta: {
              title: `Copy to Space index pattern 1 from ${sourceSpaceId} space`,
              icon: 'indexPatternApp',
            },
            type: 'index-pattern',
          },
          {
            error: { type: 'conflict', destinationId: `cts_vis_3_${destination}` },
            id: `cts_vis_3_${sourceSpaceId}`,
            meta: { title: `CTS vis 3 from ${sourceSpaceId} space`, icon: 'visualizeApp' },
            type: 'visualization',
          },
        ],
      },
    });
    const [dashboard, visualization] = await getObjectsAtSpace(kbnClient, destination);
    expect(dashboard.attributes?.title).toBe(`This is the ${destination} test space CTS dashboard`);
    expect(visualization.attributes?.title).toBe(`CTS vis 3 from ${destination} space`);
  };

export const createExpectNonOverriddenResponseWithoutReferences =
  (sourceSpaceId: string): ResolveResponseFn =>
  async (resp, { kbnClient }) => {
    const destination = getDestinationSpace(sourceSpaceId);
    expect(resp.body).toStrictEqual({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            error: { type: 'conflict', destinationId: `cts_dashboard_${destination}` },
            id: `cts_dashboard_${sourceSpaceId}`,
            type: 'dashboard',
            meta: {
              title: `This is the ${sourceSpaceId} test space CTS dashboard`,
              icon: 'dashboardApp',
            },
          },
        ],
      },
    });
    const [dashboard, visualization] = await getObjectsAtSpace(kbnClient, destination);
    expect(dashboard.attributes?.title).toBe(`This is the ${destination} test space CTS dashboard`);
    expect(visualization.attributes?.title).toBe(`CTS vis 3 from ${destination} space`);
  };

export const createExpectUnauthorizedAtSpaceWithReferencesResult =
  (spaceId: string = DEFAULT_SPACE_ID): ResolveResponseFn =>
  async (resp, { kbnClient }) => {
    const destination = getDestinationSpace(spaceId);
    expect(resp.body).toStrictEqual({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            statusCode: 403,
            error: 'Forbidden',
            message: 'Unable to bulk_create index-pattern,visualization',
          },
        ],
      },
    });
    const [dashboard, visualization] = await getObjectsAtSpace(kbnClient, destination);
    expect(dashboard.attributes?.title).toBe(`This is the ${destination} test space CTS dashboard`);
    expect(visualization.attributes?.title).toBe(`CTS vis 3 from ${destination} space`);
  };

export const createExpectUnauthorizedAtSpaceWithoutReferencesResult =
  (
    sourceSpaceId: string = DEFAULT_SPACE_ID,
    destinationSpaceId: string = getDestinationSpace(sourceSpaceId)
  ): ResolveResponseFn =>
  async (resp, { kbnClient }) => {
    expect(resp.body).toStrictEqual({
      [destinationSpaceId]: {
        success: false,
        successCount: 0,
        errors: [
          { statusCode: 403, error: 'Forbidden', message: 'Unable to bulk_create dashboard' },
        ],
      },
    });
    const [dashboard, visualization] = await getObjectsAtSpace(kbnClient, destinationSpaceId);
    if (destinationSpaceId === NON_EXISTENT_SPACE_ID) {
      expect(dashboard.statusCode).toBe(404);
      expect(visualization.statusCode).toBe(404);
    } else {
      expect(dashboard.attributes?.title).toBe(
        `This is the ${destinationSpaceId} test space CTS dashboard`
      );
      expect(visualization.attributes?.title).toBe(`CTS vis 3 from ${destinationSpaceId} space`);
    }
  };

/**
 * Creates test cases for multi-namespace saved object types. These assume the test data is
 * reloaded once per group of cases, not before every single case.
 */
export const createMultiNamespaceTestCases =
  (spaceId: string, outcome: ResolveMultiNamespaceOutcome = 'authorized') =>
  (): ResolveCopyToSpaceMultiNamespaceTest[] => {
    const statusCode = outcome === 'noAccess' ? 403 : 200;
    const type = 'event-annotation-group';
    const exactMatchId = 'each_space';
    const inexactMatchIdA = `conflict_1a_${spaceId}`;
    const inexactMatchIdB = `conflict_1b_${spaceId}`;
    const inexactMatchIdC = `conflict_1c_default_and_space_1`;
    const ambiguousConflictId = `conflict_2_${spaceId}`;

    const createRetries = (overwriteRetry: {
      type: string;
      id: string;
      overwrite: boolean;
      destinationId?: string;
    }) => ({ space_2: [overwriteRetry] });
    const getResult = (response: ApiClientResponse) => response.body.space_2;
    const expectSavedObjectForbiddenResponse = (response: ApiClientResponse) => {
      expect(response.body).toStrictEqual({
        space_2: {
          success: false,
          successCount: 0,
          errors: [
            {
              statusCode: 403,
              error: 'Forbidden',
              message: `Unable to bulk_create event-annotation-group`,
            },
          ],
        },
      });
    };
    const expectSavedObjectSuccessResponse = (
      response: ApiClientResponse,
      id: string,
      destinationId?: string
    ) => {
      const { success, successCount, successResults, errors } = getResult(response);
      expect(success).toBe(true);
      expect(successCount).toBe(1);
      expect(errors).toBeUndefined();
      const title = (() => {
        switch (id) {
          case exactMatchId:
            return 'A shared saved-object in the default, space_1, and space_2 spaces';
          case inexactMatchIdA:
            return 'This is used to test an inexact match conflict for an originId -> originId match';
          case inexactMatchIdB:
            return 'This is used to test an inexact match conflict for an originId -> id match';
          case inexactMatchIdC:
            return 'This is used to test an inexact match conflict for an id -> originId match';
          default:
            return 'A shared saved-object in one space';
        }
      })();
      expect(successResults).toStrictEqual([
        {
          type,
          id,
          meta: { title, icon: 'flag' },
          overwrite: true,
          ...(destinationId && { destinationId }),
          managed: false,
        },
      ]);
    };

    return [
      {
        testTitle: 'copying with an exact match conflict',
        objects: [{ type, id: exactMatchId }],
        retries: createRetries({ type, id: exactMatchId, overwrite: true }),
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            expectSavedObjectSuccessResponse(response, exactMatchId);
          } else if (outcome === 'noAccess') {
            await expectRouteForbiddenResponse(response, ctx);
          } else {
            expectSavedObjectForbiddenResponse(response);
          }
        },
      },
      {
        testTitle:
          'copying with an inexact match conflict (a) - originId matches existing originId',
        objects: [{ type, id: inexactMatchIdA }],
        retries: createRetries({
          type,
          id: inexactMatchIdA,
          overwrite: true,
          destinationId: 'conflict_1a_space_2',
        }),
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            expectSavedObjectSuccessResponse(response, inexactMatchIdA, 'conflict_1a_space_2');
          } else if (outcome === 'noAccess') {
            await expectRouteForbiddenResponse(response, ctx);
          } else {
            expectSavedObjectForbiddenResponse(response);
          }
        },
      },
      {
        testTitle: 'copying with an inexact match conflict (b) - originId matches existing id',
        objects: [{ type, id: inexactMatchIdB }],
        retries: createRetries({
          type,
          id: inexactMatchIdB,
          overwrite: true,
          destinationId: 'conflict_1b_space_2',
        }),
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            expectSavedObjectSuccessResponse(response, inexactMatchIdB, 'conflict_1b_space_2');
          } else if (outcome === 'noAccess') {
            await expectRouteForbiddenResponse(response, ctx);
          } else {
            expectSavedObjectForbiddenResponse(response);
          }
        },
      },
      {
        testTitle: 'copying with an inexact match conflict (c) - id matches existing originId',
        objects: [{ type, id: inexactMatchIdC }],
        retries: createRetries({
          type,
          id: inexactMatchIdC,
          overwrite: true,
          destinationId: 'conflict_1c_space_2',
        }),
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            expectSavedObjectSuccessResponse(response, inexactMatchIdC, 'conflict_1c_space_2');
          } else if (outcome === 'noAccess') {
            await expectRouteForbiddenResponse(response, ctx);
          } else {
            expectSavedObjectForbiddenResponse(response);
          }
        },
      },
      {
        testTitle: 'copying with an ambiguous conflict',
        objects: [{ type, id: ambiguousConflictId }],
        retries: createRetries({
          type,
          id: ambiguousConflictId,
          overwrite: true,
          destinationId: 'conflict_2_space_2',
        }),
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            expectSavedObjectSuccessResponse(response, ambiguousConflictId, 'conflict_2_space_2');
          } else if (outcome === 'noAccess') {
            await expectRouteForbiddenResponse(response, ctx);
          } else {
            expectSavedObjectForbiddenResponse(response);
          }
        },
      },
    ];
  };

/**
 * Logs in an interactive user scoped to the role's privileges (cookie session), provisions
 * the copy spaces, and issues `POST /api/spaces/_resolve_copy_saved_objects_errors` from the
 * origin space.
 *
 * The single-namespace cases live here; the multi-namespace "overwrite" retry group lives
 * in `resolve_copy_to_space_conflicts_multi_namespace.ts` (each file keeps exactly one
 * `apiTest.describe` call site per `@kbn/eslint/scout_max_one_describe`, and the spec's
 * root describe stays the spec file's single root for CI auto-skip). The archive is
 * reloaded per test here (`beforeEach`), at single-namespace granularity.
 */
export const resolveCopyToSpaceConflictsTest = (
  description: string,
  { user, spaceId = DEFAULT_SPACE_ID, tests }: ResolveCopyToSpaceTestDefinition
) => {
  if (spaceId !== 'default' && spaceId !== 'space_1') {
    throw new Error(
      `Unsupported origin space '${spaceId}': the copy_to_space fixtures only cover 'default' and 'space_1'`
    );
  }

  const resolvePath = `${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`;
  const dashboardObject = { type: 'dashboard', id: `cts_dashboard_${spaceId}` };
  const visualizationObject = { type: 'visualization', id: `cts_vis_3_${spaceId}` };
  const indexPatternObject = { type: 'index-pattern', id: `cts_ip_1_${spaceId}` };

  apiTest.describe(`${description} - single-namespace types`, () => {
    apiTest.beforeAll(async ({ kbnClient }) => {
      await createCopySpaces(kbnClient);
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await createCopySavedObjects(kbnClient);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteCopySavedObjects(kbnClient);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteCopySpaces(kbnClient);
    });

    apiTest(
      `should return ${tests.withReferencesNotOverwriting.statusCode} when not overwriting, with references`,
      async ({ apiClient, kbnClient, samlAuth }) => {
        const destination = getDestinationSpace(spaceId);
        const response = await apiClient.post(resolvePath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            includeReferences: true,
            createNewCopies: false,
            retries: {
              [destination]: [
                {
                  ...indexPatternObject,
                  destinationId: `cts_ip_1_${destination}`,
                  overwrite: false,
                },
                {
                  ...visualizationObject,
                  destinationId: `cts_vis_3_${destination}`,
                  overwrite: false,
                },
              ],
            },
          },
        });
        expect(response).toHaveStatusCode(tests.withReferencesNotOverwriting.statusCode);
        await tests.withReferencesNotOverwriting.response(response, { kbnClient });
      }
    );

    apiTest(
      `should return ${tests.withReferencesOverwriting.statusCode} when overwriting, with references`,
      async ({ apiClient, kbnClient, samlAuth }) => {
        const destination = getDestinationSpace(spaceId);
        const response = await apiClient.post(resolvePath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            includeReferences: true,
            createNewCopies: false,
            retries: {
              [destination]: [
                {
                  ...indexPatternObject,
                  destinationId: `cts_ip_1_${destination}`,
                  overwrite: true,
                },
                {
                  ...visualizationObject,
                  destinationId: `cts_vis_3_${destination}`,
                  overwrite: true,
                },
              ],
            },
          },
        });
        expect(response).toHaveStatusCode(tests.withReferencesOverwriting.statusCode);
        await tests.withReferencesOverwriting.response(response, { kbnClient });
      }
    );

    apiTest(
      `should return ${tests.withoutReferencesOverwriting.statusCode} when overwriting, without references`,
      async ({ apiClient, kbnClient, samlAuth }) => {
        const destination = getDestinationSpace(spaceId);
        const response = await apiClient.post(resolvePath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            includeReferences: false,
            createNewCopies: false,
            retries: {
              [destination]: [
                {
                  ...dashboardObject,
                  destinationId: `cts_dashboard_${destination}`,
                  overwrite: true,
                },
              ],
            },
          },
        });
        expect(response).toHaveStatusCode(tests.withoutReferencesOverwriting.statusCode);
        await tests.withoutReferencesOverwriting.response(response, { kbnClient });
      }
    );

    apiTest(
      `should return ${tests.withoutReferencesNotOverwriting.statusCode} when not overwriting, without references`,
      async ({ apiClient, kbnClient, samlAuth }) => {
        const destination = getDestinationSpace(spaceId);
        const response = await apiClient.post(resolvePath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            includeReferences: false,
            createNewCopies: false,
            retries: {
              [destination]: [
                {
                  ...dashboardObject,
                  destinationId: `cts_dashboard_${destination}`,
                  overwrite: false,
                },
              ],
            },
          },
        });
        expect(response).toHaveStatusCode(tests.withoutReferencesNotOverwriting.statusCode);
        await tests.withoutReferencesNotOverwriting.response(response, { kbnClient });
      }
    );

    apiTest(
      `should return ${tests.nonExistentSpace.statusCode} when resolving within a non-existent space`,
      async ({ apiClient, kbnClient, samlAuth }) => {
        const destination = NON_EXISTENT_SPACE_ID;
        const response = await apiClient.post(resolvePath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            includeReferences: false,
            createNewCopies: false,
            retries: {
              [destination]: [
                {
                  ...dashboardObject,
                  destinationId: `cts_dashboard_${destination}`,
                  overwrite: true,
                },
              ],
            },
          },
        });
        expect(response).toHaveStatusCode(tests.nonExistentSpace.statusCode);
        await tests.nonExistentSpace.response(response, { kbnClient });
      }
    );
  });
};
