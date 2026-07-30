/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { roleHeaders } from '../common/api_helpers';
import { getSystemIndicesClient, loadEsArchive, unloadEsArchive } from '../common/es_archive';
import {
  CASES,
  DEFAULT_SPACE_ID,
  fail404,
  SPACE_1_ID,
  SPACE_2_ID,
} from '../common/multi_namespace';
import { getUrlPrefix } from '../common/spaces';
import { SPACES_ES_ARCHIVE } from '../constants';
import { apiTest } from '../fixtures';
import {
  createTestDefinitions,
  type UpdateObjectsSpacesTestCase,
  verifyResult,
} from '../suites/update_objects_spaces';

const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
const NON_EXISTENT_SPACE = 'does_not_exist';

/**
 * A single request carrying every multi-namespace fixture object: each object is added to a
 * (non-existent) space and removed from the target space, verifying the resulting `spaces`
 * of every share permutation in one batch.
 * @param spaceId the space in which the test will take place (and the space the objects will
 * be removed from)
 */
const createSinglePartTestCase = (spaceId: string): UpdateObjectsSpacesTestCase => ({
  objects: [
    { ...CASES.DEFAULT_ONLY, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SPACE_1_ONLY, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SPACE_2_ONLY, ...fail404(spaceId !== SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_1, ...fail404(spaceId === SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_2, ...fail404(spaceId === SPACE_1_ID) },
    { ...CASES.SPACE_1_AND_SPACE_2, ...fail404(spaceId === DEFAULT_SPACE_ID) },
    CASES.EACH_SPACE,
    CASES.ALL_SPACES,
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ],
  spacesToAdd: ['some-space-id'],
  spacesToRemove: [spaceId],
});

/**
 * Sequential cases verifying that legacy URL aliases are deleted when the objects they point
 * to are unshared from a space. Each step's `existingNamespaces` reflects the mutations made
 * by the preceding steps, and `expectAliasDifference` is cumulative.
 */
const createAliasDeletionTestCases = (): UpdateObjectsSpacesTestCase[] => [
  {
    objects: [
      {
        id: CASES.ALIAS_DELETE_INCLUSIVE.id,
        existingNamespaces: EACH_SPACE,
        expectAliasDifference: -1, // one alias should have been deleted from space_2
      },
    ],
    spacesToAdd: [],
    spacesToRemove: [SPACE_2_ID],
  },
  {
    objects: [
      {
        id: CASES.ALIAS_DELETE_INCLUSIVE.id,
        existingNamespaces: [DEFAULT_SPACE_ID, SPACE_1_ID],
        expectAliasDifference: -1, // no aliases should have been deleted from space_1
      },
    ],
    spacesToAdd: [],
    spacesToRemove: [SPACE_1_ID],
  },
  {
    objects: [
      {
        id: CASES.ALIAS_DELETE_INCLUSIVE.id,
        existingNamespaces: [DEFAULT_SPACE_ID],
        expectAliasDifference: -2, // one alias should have been deleted from the default space
      },
    ],
    spacesToAdd: [],
    spacesToRemove: [DEFAULT_SPACE_ID],
  },
  {
    objects: [
      {
        id: CASES.ALIAS_DELETE_EXCLUSIVE.id,
        existingNamespaces: [SPACE_1_ID],
        expectAliasDifference: -3, // one alias should have been deleted from other_space
      },
    ],
    spacesToAdd: [SPACE_1_ID],
    spacesToRemove: ['*'],
  },
];

/**
 * Sequential cases exercising add/remove permutations against existing, non-existent, and
 * all (`'*'`) spaces, including the object becoming inaccessible from the requesting space.
 */
const createSpacePermutationTestCases = (): UpdateObjectsSpacesTestCase[] => [
  // first, add this object to each space and remove it from a non-existent space
  // this will succeed even though the object already exists in the default space and it doesn't exist in the non-existent space
  {
    objects: [CASES.DEFAULT_ONLY],
    spacesToAdd: EACH_SPACE,
    spacesToRemove: [NON_EXISTENT_SPACE],
  },
  // second, add this object to a non-existent space and all spaces, and remove it from the default space
  {
    objects: [{ id: CASES.DEFAULT_ONLY.id, existingNamespaces: EACH_SPACE }],
    spacesToAdd: [NON_EXISTENT_SPACE, '*'],
    spacesToRemove: [DEFAULT_SPACE_ID],
  },
  // third, remove the object from all spaces
  // the object is still accessible in the context of the default space because it currently exists in all spaces
  {
    objects: [
      {
        id: CASES.DEFAULT_ONLY.id,
        existingNamespaces: [SPACE_1_ID, SPACE_2_ID, NON_EXISTENT_SPACE, '*'],
      },
    ],
    spacesToAdd: [],
    spacesToRemove: ['*'],
  },
  // fourth, remove the object from space_1
  // this will fail because, even though the object still exists, it no longer exists in the context of the default space
  {
    objects: [
      {
        id: CASES.DEFAULT_ONLY.id,
        existingNamespaces: [SPACE_1_ID, SPACE_2_ID, NON_EXISTENT_SPACE],
        ...fail404(),
      },
    ],
    spacesToAdd: [],
    spacesToRemove: [SPACE_1_ID],
  },
];

/**
 * Sequential cases verifying that an object is deleted once it is removed from every space
 * it exists in, and that subsequent updates targeting it return 404.
 */
const createImplicitDeletionTestCases = (): UpdateObjectsSpacesTestCase[] => [
  // first, add this object to space_2 and remove it from space_1
  {
    objects: [CASES.DEFAULT_AND_SPACE_1],
    spacesToAdd: [SPACE_2_ID],
    spacesToRemove: [SPACE_1_ID],
  },
  // second, remove this object from the default space and space_2
  // since the object would no longer exist in any spaces, it will be deleted
  {
    objects: [
      { id: CASES.DEFAULT_AND_SPACE_1.id, existingNamespaces: [DEFAULT_SPACE_ID, SPACE_2_ID] },
    ],
    spacesToAdd: [],
    spacesToRemove: [DEFAULT_SPACE_ID, SPACE_1_ID],
  },
  // third, add the object to the default space
  // this will fail because the object no longer exists
  {
    objects: [{ id: CASES.DEFAULT_AND_SPACE_1.id, existingNamespaces: [], ...fail404() }],
    spacesToAdd: [DEFAULT_SPACE_ID],
    spacesToRemove: [],
  },
];

/**
 * Functional (non-authZ) coverage of `POST /api/spaces/_update_objects_spaces`, ported from
 * the FTR `spaces_only` variant of this suite: share/unshare permutations targeting every
 * space, object lifecycle when removed from all spaces, and legacy URL alias deletion on
 * unshare. Every request runs as a fully privileged user; the per-role authorization matrix
 * lives in `security_and_spaces/update_objects_spaces.spec.ts`.
 */
apiTest.describe('spaces api lifecycle - update objects spaces', { tag: tags.stateful.all }, () => {
  apiTest.beforeEach(async ({ config }) => {
    await loadEsArchive(config.hosts.elasticsearch, SPACES_ES_ARCHIVE);
  });

  apiTest.afterAll(async ({ config }) => {
    await unloadEsArchive(config.hosts.elasticsearch, SPACES_ES_ARCHIVE);
  });

  const singlePartTargets = [
    ['shares and unshares objects targeting the default space', DEFAULT_SPACE_ID],
    ['shares and unshares objects targeting space_1', SPACE_1_ID],
    ['shares and unshares objects targeting space_2', SPACE_2_ID],
  ] as const;

  for (const [title, spaceId] of singlePartTargets) {
    apiTest(title, async ({ apiClient, samlAuth }) => {
      const headers = await roleHeaders(samlAuth, 'superuser');
      const [test] = createTestDefinitions(createSinglePartTestCase(spaceId), false);

      const response = await apiClient.post(
        `${getUrlPrefix(spaceId)}/api/spaces/_update_objects_spaces`,
        { headers, body: test.request }
      );

      expect(response).toHaveStatusCode(200);
      await verifyResult(test.testCase, 200, undefined, response);
    });
  }

  const sequentialSuites = [
    [
      'deletes legacy URL aliases when objects are unshared',
      createAliasDeletionTestCases,
      true, // asserts alias counts, so the steps need the system-indices ES client
    ],
    [
      'handles space add/remove permutations, including non-existent and all spaces',
      createSpacePermutationTestCases,
      false,
    ],
    [
      'deletes objects once they are removed from every space',
      createImplicitDeletionTestCases,
      false,
    ],
  ] as const;

  for (const [title, createCases, assertsAliases] of sequentialSuites) {
    apiTest(title, async ({ apiClient, samlAuth, config }) => {
      const headers = await roleHeaders(samlAuth, 'superuser');
      const esClient = assertsAliases
        ? getSystemIndicesClient(config.hosts.elasticsearch)
        : undefined;
      // each step's `existingNamespaces` reflects the previous steps' mutations, so the
      // steps must run sequentially, in order, against a single archive load
      const tests = createTestDefinitions(createCases(), false);

      for (const test of tests) {
        await apiTest.step(test.title, async () => {
          const response = await apiClient.post(
            `${getUrlPrefix(DEFAULT_SPACE_ID)}/api/spaces/_update_objects_spaces`,
            { headers, body: test.request }
          );

          expect(response).toHaveStatusCode(200);
          await verifyResult(test.testCase, 200, undefined, response, esClient);
        });
      }
    });
  }
});
