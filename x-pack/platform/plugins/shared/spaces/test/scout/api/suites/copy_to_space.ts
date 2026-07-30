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
import {
  createCopySavedObjects,
  createCopySpaces,
  deleteCopySavedObjects,
  deleteCopySpaces,
} from '../common/copy_to_space_data';
import type { RoleName } from '../common/roles';
import { getAggregatedSpaceData } from '../common/saved_objects';
import { getUrlPrefix } from '../common/spaces';
import { apiTest } from '../fixtures';

const DEFAULT_SPACE_ID = 'default';

export interface CopyResponseContext {
  esClient: Client;
}

export type CopyResponseFn = (resp: ApiClientResponse, ctx: CopyResponseContext) => Promise<void>;

interface CopyToSpaceTest {
  statusCode: number;
  response: CopyResponseFn;
}

export interface CopyToSpaceMultiNamespaceTest {
  testTitle: string;
  objects: Array<Record<string, any>>;
  statusCode: number;
  response: CopyResponseFn;
}

export interface CopyToSpaceTests {
  noConflictsWithoutReferences: CopyToSpaceTest;
  noConflictsWithReferences: CopyToSpaceTest;
  withConflictsOverwriting: CopyToSpaceTest;
  withConflictsWithoutOverwriting: CopyToSpaceTest;
  nonExistentSpace: CopyToSpaceTest;
  multipleSpaces: {
    statusCode: number;
    withConflictsResponse: CopyResponseFn;
    noConflictsResponse: CopyResponseFn;
  };
}

export type MultiNamespaceOutcome =
  | 'authorized'
  | 'unauthorizedRead'
  | 'unauthorizedWrite'
  | 'noAccess';

interface CopyToSpaceTestDefinition {
  user: RoleName;
  spaceId?: string;
  tests: CopyToSpaceTests;
}

const INITIAL_COUNTS: Record<string, Record<string, number>> = {
  [DEFAULT_SPACE_ID]: { dashboard: 1, visualization: 3, 'index-pattern': 1 },
  space_1: { dashboard: 1, visualization: 3, 'index-pattern': 1 },
};
const UUID_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

const getDestinationWithoutConflicts = () => 'space_2';
const getDestinationWithConflicts = (originSpaceId?: string) =>
  !originSpaceId || originSpaceId === DEFAULT_SPACE_ID ? 'space_1' : DEFAULT_SPACE_ID;
const getDestinationSpace = (
  sourceSpaceId: string,
  type: 'with-conflicts' | 'without-conflicts' | 'non-existent'
) => {
  if (type === 'non-existent') {
    return 'non_existent_space';
  }
  return type === 'with-conflicts'
    ? getDestinationWithConflicts(sourceSpaceId)
    : getDestinationWithoutConflicts();
};

interface CountByTypeBucket {
  key: string;
  doc_count: number;
}

const assertSpaceCounts = async (
  esClient: Client,
  spaceId: string,
  expectedCounts: Record<string, number> = {}
) => {
  const bucketSorter = (b1: CountByTypeBucket, b2: CountByTypeBucket) => (b1.key < b2.key ? -1 : 1);
  const response = await getAggregatedSpaceData(esClient, [
    'visualization',
    'dashboard',
    'index-pattern',
  ]);
  const buckets = response.aggregations?.count.buckets ?? [];
  const spaceBucket = buckets.find((b) => b.key === spaceId);

  if (!spaceBucket) {
    expect(Object.keys(expectedCounts)).toHaveLength(0);
    return;
  }

  const countByType = spaceBucket.countByType as {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: CountByTypeBucket[];
  };
  const expectedBuckets = Object.entries(expectedCounts).map(([type, count]) => ({
    key: type,
    doc_count: count,
  }));

  expectedBuckets.sort(bucketSorter);
  countByType.buckets.sort(bucketSorter);

  expect(countByType).toStrictEqual({
    doc_count_error_upper_bound: 0,
    sum_other_doc_count: 0,
    buckets: expectedBuckets,
  });
};

const expectRouteForbiddenBody = createExpectRbacForbidden(
  'API [POST /api/spaces/_copy_saved_objects] is unauthorized for user, this action is granted by the Kibana privileges [copySavedObjectsToSpaces]'
);

export const expectRouteForbiddenResponse: CopyResponseFn = async (resp) => {
  expectRouteForbiddenBody(resp);
};

const createExpectNoConflictsWithoutReferencesForSpace =
  (spaceId: string, destination: string, expectedDashboardCount: number): CopyResponseFn =>
  async (resp, { esClient }) => {
    const result = resp.body;
    const dashboardDestinationId = result[destination].successResults[0].destinationId;
    expect(dashboardDestinationId).toMatch(UUID_PATTERN);

    expect(result).toStrictEqual({
      [destination]: {
        success: true,
        successCount: 1,
        successResults: [
          {
            id: `cts_dashboard_${spaceId}`,
            type: 'dashboard',
            meta: {
              title: `This is the ${spaceId} test space CTS dashboard`,
              icon: 'dashboardApp',
            },
            destinationId: dashboardDestinationId,
            managed: false,
          },
        ],
      },
    });

    await assertSpaceCounts(esClient, destination, { dashboard: expectedDashboardCount });
  };

export const expectNoConflictsWithoutReferencesResult = (spaceId: string = DEFAULT_SPACE_ID) =>
  createExpectNoConflictsWithoutReferencesForSpace(spaceId, getDestinationWithoutConflicts(), 1);

export const expectNoConflictsForNonExistentSpaceResult = (spaceId: string = DEFAULT_SPACE_ID) =>
  createExpectNoConflictsWithoutReferencesForSpace(spaceId, 'non_existent_space', 1);

export const expectNoConflictsWithReferencesResult =
  (spaceId: string = DEFAULT_SPACE_ID): CopyResponseFn =>
  async (resp, { esClient }) => {
    const destination = getDestinationWithoutConflicts();
    const result = resp.body;

    const successResults = result[destination].successResults;
    for (let i = 0; i < 5; i++) {
      expect(successResults[i].destinationId).toMatch(UUID_PATTERN);
    }

    expect(result).toStrictEqual({
      [destination]: {
        success: true,
        successCount: 5,
        successResults: [
          {
            id: `cts_ip_1_${spaceId}`,
            type: 'index-pattern',
            meta: {
              icon: 'indexPatternApp',
              title: `Copy to Space index pattern 1 from ${spaceId} space`,
            },
            destinationId: successResults[0].destinationId,
            managed: false,
          },
          {
            id: `cts_vis_1_${spaceId}`,
            type: 'visualization',
            meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
            destinationId: successResults[1].destinationId,
            managed: false,
          },
          {
            id: `cts_vis_2_${spaceId}`,
            type: 'visualization',
            meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
            destinationId: successResults[2].destinationId,
            managed: false,
          },
          {
            id: `cts_vis_3_${spaceId}`,
            type: 'visualization',
            meta: { icon: 'visualizeApp', title: `CTS vis 3 from ${spaceId} space` },
            destinationId: successResults[3].destinationId,
            managed: false,
          },
          {
            id: `cts_dashboard_${spaceId}`,
            type: 'dashboard',
            meta: {
              icon: 'dashboardApp',
              title: `This is the ${spaceId} test space CTS dashboard`,
            },
            destinationId: successResults[4].destinationId,
            managed: false,
          },
        ],
      },
    });

    await assertSpaceCounts(esClient, destination, {
      dashboard: 1,
      visualization: 3,
      'index-pattern': 1,
    });
  };

export const createExpectUnauthorizedAtSpaceWithReferencesResult =
  (
    spaceId: string = DEFAULT_SPACE_ID,
    type: 'with-conflicts' | 'without-conflicts'
  ): CopyResponseFn =>
  async (resp, { esClient }) => {
    const destination = getDestinationSpace(spaceId, type);

    expect(resp.body).toStrictEqual({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            statusCode: 403,
            error: 'Forbidden',
            message: 'Unable to bulk_create dashboard,index-pattern,visualization',
          },
        ],
      },
    });

    await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);
  };

export const createExpectUnauthorizedAtSpaceWithoutReferencesResult =
  (
    spaceId: string = DEFAULT_SPACE_ID,
    type: 'with-conflicts' | 'without-conflicts' | 'non-existent'
  ): CopyResponseFn =>
  async (resp, { esClient }) => {
    const destination = getDestinationSpace(spaceId, type);

    expect(resp.body).toStrictEqual({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            statusCode: 403,
            error: 'Forbidden',
            message: 'Unable to bulk_create dashboard',
          },
        ],
      },
    });

    await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);
  };

export const createExpectWithConflictsOverwritingResult =
  (spaceId?: string): CopyResponseFn =>
  async (resp, { esClient }) => {
    const destination = getDestinationWithConflicts(spaceId);
    const result = resp.body;

    const successResults = result[destination].successResults;
    expect(successResults[1].destinationId).toMatch(UUID_PATTERN);
    expect(successResults[2].destinationId).toMatch(UUID_PATTERN);

    expect(result).toStrictEqual({
      [destination]: {
        success: true,
        successCount: 5,
        successResults: [
          {
            id: `cts_ip_1_${spaceId}`,
            type: 'index-pattern',
            meta: {
              icon: 'indexPatternApp',
              title: `Copy to Space index pattern 1 from ${spaceId} space`,
            },
            overwrite: true,
            destinationId: `cts_ip_1_${destination}`,
            managed: false,
          },
          {
            id: `cts_vis_1_${spaceId}`,
            type: 'visualization',
            meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
            destinationId: successResults[1].destinationId,
            managed: false,
          },
          {
            id: `cts_vis_2_${spaceId}`,
            type: 'visualization',
            meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
            destinationId: successResults[2].destinationId,
            managed: false,
          },
          {
            id: `cts_vis_3_${spaceId}`,
            type: 'visualization',
            meta: { icon: 'visualizeApp', title: `CTS vis 3 from ${spaceId} space` },
            overwrite: true,
            destinationId: `cts_vis_3_${destination}`,
            managed: false,
          },
          {
            id: `cts_dashboard_${spaceId}`,
            type: 'dashboard',
            meta: {
              icon: 'dashboardApp',
              title: `This is the ${spaceId} test space CTS dashboard`,
            },
            overwrite: true,
            destinationId: `cts_dashboard_${destination}`,
            managed: false,
          },
        ],
      },
    });

    await assertSpaceCounts(esClient, destination, {
      dashboard: 1,
      visualization: 5,
      'index-pattern': 1,
    });
  };

export const createExpectWithConflictsWithoutOverwritingResult =
  (spaceId?: string): CopyResponseFn =>
  async (resp, { esClient }) => {
    const errorSorter = (e1: { id: string }, e2: { id: string }) => (e1.id < e2.id ? -1 : 1);
    const destination = getDestinationWithConflicts(spaceId);
    const result = resp.body;
    result[destination].errors.sort(errorSorter);

    const successResults = result[destination].successResults;
    expect(successResults[0].destinationId).toMatch(UUID_PATTERN);
    expect(successResults[1].destinationId).toMatch(UUID_PATTERN);

    const expectedSuccessResults = [
      {
        id: `cts_vis_1_${spaceId}`,
        type: 'visualization',
        meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
        destinationId: successResults[0].destinationId,
        managed: false,
      },
      {
        id: `cts_vis_2_${spaceId}`,
        type: 'visualization',
        meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
        destinationId: successResults[1].destinationId,
        managed: false,
      },
    ];
    const expectedErrors = [
      {
        error: { type: 'conflict', destinationId: `cts_dashboard_${destination}` },
        id: `cts_dashboard_${spaceId}`,
        type: 'dashboard',
        meta: { title: `This is the ${spaceId} test space CTS dashboard`, icon: 'dashboardApp' },
      },
      {
        error: { type: 'conflict', destinationId: `cts_ip_1_${destination}` },
        id: `cts_ip_1_${spaceId}`,
        type: 'index-pattern',
        meta: {
          title: `Copy to Space index pattern 1 from ${spaceId} space`,
          icon: 'indexPatternApp',
        },
      },
      {
        error: { type: 'conflict', destinationId: `cts_vis_3_${destination}` },
        id: `cts_vis_3_${spaceId}`,
        type: 'visualization',
        meta: { title: `CTS vis 3 from ${spaceId} space`, icon: 'visualizeApp' },
      },
    ];
    expectedErrors.sort(errorSorter);

    expect(result).toStrictEqual({
      [destination]: {
        success: false,
        successCount: 2,
        successResults: expectedSuccessResults,
        errors: expectedErrors,
      },
    });

    await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);
  };

/**
 * Creates test cases for multi-namespace saved object types. Test data is reloaded once
 * per group of cases, not before each case, so the assertions account for prior mutations.
 */
export const createMultiNamespaceTestCases =
  (spaceId: string, outcome: MultiNamespaceOutcome = 'authorized') =>
  (overwrite: boolean, createNewCopies: boolean): CopyToSpaceMultiNamespaceTest[] => {
    const statusCode = outcome === 'noAccess' ? 403 : 200;
    const type = 'event-annotation-group';
    const noConflictId = `${spaceId}_only`;
    const exactMatchId = 'each_space';
    const inexactMatchIdA = `conflict_1a_${spaceId}`;
    const inexactMatchIdB = `conflict_1b_${spaceId}`;
    const inexactMatchIdC = `conflict_1c_default_and_space_1`;
    const ambiguousConflictId = `conflict_2_${spaceId}`;

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

    const expectNewCopyResponse = (
      response: ApiClientResponse,
      sourceId: string,
      title: string
    ) => {
      const { success, successCount, successResults, errors } = getResult(response);
      expect(success).toBe(true);
      expect(successCount).toBe(1);
      const destinationId = successResults[0].destinationId;
      expect(destinationId).toMatch(UUID_PATTERN);
      expect(successResults).toStrictEqual([
        { type, id: sourceId, meta: { title, icon: 'flag' }, destinationId, managed: false },
      ]);
      expect(errors).toBeUndefined();
    };

    return [
      {
        testTitle: 'copying with no conflict',
        objects: [{ type, id: noConflictId }],
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            expectNewCopyResponse(response, noConflictId, 'A shared saved-object in one space');
          } else if (outcome === 'noAccess') {
            await expectRouteForbiddenResponse(response, ctx);
          } else {
            expectSavedObjectForbiddenResponse(response);
          }
        },
      },
      {
        testTitle: 'copying with an exact match conflict',
        objects: [{ type, id: exactMatchId }],
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized' || (outcome === 'unauthorizedWrite' && !createNewCopies)) {
            const { success, successCount, successResults, errors } = getResult(response);
            const title = 'A shared saved-object in the default, space_1, and space_2 spaces';
            if (createNewCopies) {
              expectNewCopyResponse(response, exactMatchId, title);
            } else {
              expect(success).toBe(true);
              expect(successCount).toBe(0);
              expect(successResults).toBeUndefined();
              expect(errors).toBeUndefined();
            }
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
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            const { success, successCount, successResults, errors } = getResult(response);
            const title =
              'This is used to test an inexact match conflict for an originId -> originId match';
            const meta = { title, icon: 'flag' };
            const destinationId = 'conflict_1a_space_2';
            if (createNewCopies) {
              expectNewCopyResponse(response, inexactMatchIdA, title);
            } else if (overwrite) {
              expect(success).toBe(true);
              expect(successCount).toBe(1);
              expect(successResults).toStrictEqual([
                { type, id: inexactMatchIdA, meta, overwrite: true, destinationId, managed: false },
              ]);
              expect(errors).toBeUndefined();
            } else {
              expect(success).toBe(false);
              expect(successCount).toBe(0);
              expect(successResults).toBeUndefined();
              expect(errors).toStrictEqual([
                { error: { type: 'conflict', destinationId }, type, id: inexactMatchIdA, meta },
              ]);
            }
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
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            const { success, successCount, successResults, errors } = getResult(response);
            const title =
              'This is used to test an inexact match conflict for an originId -> id match';
            const meta = { title, icon: 'flag' };
            const destinationId = 'conflict_1b_space_2';
            if (createNewCopies) {
              expectNewCopyResponse(response, inexactMatchIdB, title);
            } else if (overwrite) {
              expect(success).toBe(true);
              expect(successCount).toBe(1);
              expect(successResults).toStrictEqual([
                { type, id: inexactMatchIdB, meta, overwrite: true, destinationId, managed: false },
              ]);
              expect(errors).toBeUndefined();
            } else {
              expect(success).toBe(false);
              expect(successCount).toBe(0);
              expect(successResults).toBeUndefined();
              expect(errors).toStrictEqual([
                { error: { type: 'conflict', destinationId }, type, id: inexactMatchIdB, meta },
              ]);
            }
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
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            const { success, successCount, successResults, errors } = getResult(response);
            const title =
              'This is used to test an inexact match conflict for an id -> originId match';
            const meta = { title, icon: 'flag' };
            const destinationId = 'conflict_1c_space_2';
            if (createNewCopies) {
              expectNewCopyResponse(response, inexactMatchIdC, title);
            } else if (overwrite) {
              expect(success).toBe(true);
              expect(successCount).toBe(1);
              expect(successResults).toStrictEqual([
                { type, id: inexactMatchIdC, meta, overwrite: true, destinationId, managed: false },
              ]);
              expect(errors).toBeUndefined();
            } else {
              expect(success).toBe(false);
              expect(successCount).toBe(0);
              expect(successResults).toBeUndefined();
              expect(errors).toStrictEqual([
                { error: { type: 'conflict', destinationId }, type, id: inexactMatchIdC, meta },
              ]);
            }
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
        statusCode,
        response: async (response, ctx) => {
          if (outcome === 'authorized') {
            const { success, successCount, successResults, errors } = getResult(response);
            const title = 'A shared saved-object in one space';
            if (createNewCopies) {
              expectNewCopyResponse(response, ambiguousConflictId, title);
            } else {
              const importAmbiguousConflictError = errors?.[0].error;
              const actualDestinations = importAmbiguousConflictError?.destinations ?? [];
              const updatedAtById = (destinationId: string) =>
                actualDestinations.find(
                  (d: { id: string; updatedAt?: string }) => d.id === destinationId
                )?.updatedAt;
              const destinations = [
                {
                  id: 'conflict_2_all',
                  title: 'A shared saved-object in all spaces',
                  updatedAt: updatedAtById('conflict_2_all'),
                },
                {
                  id: 'conflict_2_space_2',
                  title: 'A shared saved-object in one space',
                  updatedAt: updatedAtById('conflict_2_space_2'),
                },
              ].sort((a, b) => {
                const aUpdatedAt = a.updatedAt ?? '';
                const bUpdatedAt = b.updatedAt ?? '';
                if (aUpdatedAt !== bUpdatedAt) {
                  return aUpdatedAt < bUpdatedAt ? 1 : -1;
                }
                return a.id < b.id ? -1 : 1;
              });
              expect(success).toBe(false);
              expect(successCount).toBe(0);
              expect(successResults).toBeUndefined();
              expect(errors).toStrictEqual([
                {
                  error: { type: 'ambiguous_conflict', destinations },
                  type,
                  id: ambiguousConflictId,
                  meta: { title, icon: 'flag' },
                },
              ]);
            }
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
 * the copy spaces and issues `POST /api/spaces/_copy_saved_objects` from the origin space
 * for each scenario.
 *
 * The single-namespace cases live here; the multi-namespace combo groups live in
 * `copy_to_space_multi_namespace.ts` (each file keeps exactly one `apiTest.describe` call
 * site per `@kbn/eslint/scout_max_one_describe`, and the spec's root describe stays the
 * spec file's single root for CI auto-skip). The archive is reloaded per test here
 * (`beforeEach`), at single-namespace granularity.
 */
export const copyToSpaceTest = (
  description: string,
  { user, spaceId = DEFAULT_SPACE_ID, tests }: CopyToSpaceTestDefinition
) => {
  if (spaceId !== 'default' && spaceId !== 'space_1') {
    throw new Error(
      `Unsupported origin space '${spaceId}': the copy_to_space fixtures only cover 'default' and 'space_1'`
    );
  }

  const copyPath = `${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`;
  const dashboardObject = { type: 'dashboard', id: `cts_dashboard_${spaceId}` };

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
      `should return ${tests.noConflictsWithoutReferences.statusCode} when copying to space without conflicts or references`,
      async ({ apiClient, esClient, samlAuth }) => {
        const destination = getDestinationWithoutConflicts();
        await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);

        const response = await apiClient.post(copyPath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            spaces: [destination],
            includeReferences: false,
            createNewCopies: false,
            overwrite: false,
          },
        });

        expect(response).toHaveStatusCode(tests.noConflictsWithoutReferences.statusCode);
        await tests.noConflictsWithoutReferences.response(response, { esClient });
      }
    );

    apiTest(
      `should return ${tests.noConflictsWithReferences.statusCode} when copying to space without conflicts with references`,
      async ({ apiClient, esClient, samlAuth }) => {
        const destination = getDestinationWithoutConflicts();
        await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);

        const response = await apiClient.post(copyPath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            spaces: [destination],
            includeReferences: true,
            createNewCopies: false,
            overwrite: false,
          },
        });

        expect(response).toHaveStatusCode(tests.noConflictsWithReferences.statusCode);
        await tests.noConflictsWithReferences.response(response, { esClient });
      }
    );

    apiTest(
      `should return ${tests.withConflictsOverwriting.statusCode} when copying to space with conflicts when overwriting`,
      async ({ apiClient, esClient, samlAuth }) => {
        const destination = getDestinationWithConflicts(spaceId);
        await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);

        const response = await apiClient.post(copyPath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            spaces: [destination],
            includeReferences: true,
            createNewCopies: false,
            overwrite: true,
          },
        });

        expect(response).toHaveStatusCode(tests.withConflictsOverwriting.statusCode);
        await tests.withConflictsOverwriting.response(response, { esClient });
      }
    );

    apiTest(
      `should return ${tests.withConflictsWithoutOverwriting.statusCode} when copying to space with conflicts without overwriting`,
      async ({ apiClient, esClient, samlAuth }) => {
        const destination = getDestinationWithConflicts(spaceId);
        await assertSpaceCounts(esClient, destination, INITIAL_COUNTS[destination]);

        const response = await apiClient.post(copyPath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            spaces: [destination],
            includeReferences: true,
            createNewCopies: false,
            overwrite: false,
          },
        });

        expect(response).toHaveStatusCode(tests.withConflictsWithoutOverwriting.statusCode);
        await tests.withConflictsWithoutOverwriting.response(response, { esClient });
      }
    );

    apiTest(
      `should return ${tests.multipleSpaces.statusCode} when copying to multiple spaces`,
      async ({ apiClient, esClient, samlAuth }) => {
        const conflictDestination = getDestinationWithConflicts(spaceId);
        const noConflictDestination = getDestinationWithoutConflicts();

        const response = await apiClient.post(copyPath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            spaces: [conflictDestination, noConflictDestination],
            includeReferences: true,
            createNewCopies: false,
            overwrite: true,
          },
        });

        expect(response).toHaveStatusCode(tests.multipleSpaces.statusCode);

        // For a 200 the response body is keyed by destination space id, so each destination's
        // slice is asserted separately; a non-200 response is a single (route-forbidden) body
        // that both response assertions receive as-is.
        const is200 = tests.multipleSpaces.statusCode === 200;
        // A 200 body must contain exactly the two requested destinations — an extra key
        // would mean the object was copied into an unrequested space — while the 403 body
        // is the standard route-forbidden envelope.
        const expectedBodyKeys = is200
          ? [conflictDestination, noConflictDestination].sort()
          : ['error', 'message', 'statusCode'];
        expect(Object.keys(response.body).sort()).toStrictEqual(expectedBodyKeys);
        const noConflictResp = is200
          ? { ...response, body: { [noConflictDestination]: response.body[noConflictDestination] } }
          : response;
        const conflictResp = is200
          ? { ...response, body: { [conflictDestination]: response.body[conflictDestination] } }
          : response;

        await tests.multipleSpaces.noConflictsResponse(noConflictResp, { esClient });
        await tests.multipleSpaces.withConflictsResponse(conflictResp, { esClient });
      }
    );

    apiTest(
      `should return ${tests.nonExistentSpace.statusCode} when copying to non-existent space`,
      async ({ apiClient, esClient, samlAuth }) => {
        const response = await apiClient.post(copyPath, {
          headers: await roleHeaders(samlAuth, user),
          body: {
            objects: [dashboardObject],
            spaces: ['non_existent_space'],
            includeReferences: false,
            createNewCopies: false,
            overwrite: true,
          },
        });

        expect(response).toHaveStatusCode(tests.nonExistentSpace.statusCode);
        await tests.nonExistentSpace.response(response, { esClient });
      }
    );
  });
};
