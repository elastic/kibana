/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import {
  CASES,
  DEFAULT_SPACE_ID,
  fail404,
  SECURITY_AND_SPACES_SCENARIOS,
  SPACE_1_ID,
  SPACE_2_ID,
} from '../../common/multi_namespace';
import { apiTest } from '../../fixtures';
import {
  createTestDefinitions,
  type UpdateObjectsSpacesTestCase,
  updateTest,
} from '../../suites/update_objects_spaces';

const createTestCases = (spaceId: string): UpdateObjectsSpacesTestCase[] => {
  const eachSpace = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
  // Note: alias-deletion cases are intentionally excluded (covered by
  // `tests/update_objects_spaces_lifecycle.spec.ts`, and there is no authZ-specific logic
  // affecting alias deletion).
  return [
    { objects: [CASES.EACH_SPACE], spacesToAdd: ['*'], spacesToRemove: [] },
    {
      objects: [{ id: CASES.EACH_SPACE.id, existingNamespaces: [...eachSpace, '*'] }],
      spacesToAdd: [],
      spacesToRemove: ['*'],
    },

    {
      objects: [{ ...CASES.DEFAULT_ONLY, ...fail404(spaceId !== DEFAULT_SPACE_ID) }],
      spacesToAdd: [SPACE_1_ID, SPACE_2_ID],
      spacesToRemove: [],
    },
    {
      objects: [{ ...CASES.SPACE_1_ONLY, ...fail404(spaceId !== SPACE_1_ID) }],
      spacesToAdd: [DEFAULT_SPACE_ID, SPACE_2_ID],
      spacesToRemove: [],
    },
    {
      objects: [{ ...CASES.SPACE_2_ONLY, ...fail404(spaceId !== SPACE_2_ID) }],
      spacesToAdd: [DEFAULT_SPACE_ID, SPACE_1_ID],
      spacesToRemove: [],
    },
    {
      objects: [
        {
          id: CASES.DEFAULT_ONLY.id,
          existingNamespaces: eachSpace,
          ...fail404(spaceId !== DEFAULT_SPACE_ID),
        },
        {
          id: CASES.SPACE_1_ONLY.id,
          existingNamespaces: eachSpace,
          ...fail404(spaceId !== SPACE_1_ID),
        },
        {
          id: CASES.SPACE_2_ONLY.id,
          existingNamespaces: eachSpace,
          ...fail404(spaceId !== SPACE_2_ID),
        },
      ],
      spacesToAdd: [],
      spacesToRemove: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
    },

    {
      objects: [
        { ...CASES.DEFAULT_AND_SPACE_1, ...fail404(spaceId === SPACE_2_ID) },
        { ...CASES.DEFAULT_AND_SPACE_2, ...fail404(spaceId === SPACE_1_ID) },
        { ...CASES.SPACE_1_AND_SPACE_2, ...fail404(spaceId === DEFAULT_SPACE_ID) },
        CASES.ALL_SPACES,
        { ...CASES.DOES_NOT_EXIST, ...fail404() },
      ],
      spacesToAdd: [spaceId],
      spacesToRemove: [],
    },
    {
      objects: [
        { ...CASES.DEFAULT_AND_SPACE_1, ...fail404(spaceId === SPACE_2_ID) },
        { ...CASES.DEFAULT_AND_SPACE_2, ...fail404(spaceId === SPACE_1_ID) },
        { ...CASES.SPACE_1_AND_SPACE_2, ...fail404(spaceId === DEFAULT_SPACE_ID) },
        { id: CASES.ALL_SPACES.id, existingNamespaces: ['*', spaceId] },
        { ...CASES.DOES_NOT_EXIST, ...fail404() },
      ],
      spacesToAdd: [],
      spacesToRemove: [spaceId],
    },
  ];
};

const calculateSingleSpaceAuthZ = (testCases: UpdateObjectsSpacesTestCase[], spaceId: string) => {
  const targetsThisSpace: UpdateObjectsSpacesTestCase[] = [];
  const targetsOtherSpace: UpdateObjectsSpacesTestCase[] = [];

  for (const testCase of testCases) {
    const { spacesToAdd, spacesToRemove } = testCase;
    const spacesToAddOrRemove = [...spacesToAdd, ...spacesToRemove];
    if (spacesToAddOrRemove.length === 1 && spacesToAddOrRemove[0] === spaceId) {
      targetsThisSpace.push(testCase);
    } else {
      targetsOtherSpace.push(testCase);
    }
  }

  return { targetsThisSpace, targetsOtherSpace };
};

apiTest.describe(
  'spaces api authorization - update objects spaces',
  { tag: tags.stateful.all },
  () => {
    SECURITY_AND_SPACES_SCENARIOS.forEach(({ spaceId, users }) => {
      const suffix = ` targeting the ${spaceId} space`;
      const testCases = createTestCases(spaceId);
      const { targetsThisSpace, targetsOtherSpace } = calculateSingleSpaceAuthZ(testCases, spaceId);

      const unauthorized = createTestDefinitions(testCases, true);
      const authorizedThisSpace = [
        createTestDefinitions(targetsOtherSpace, true),
        createTestDefinitions(targetsThisSpace, false, { authorizedSpace: spaceId }),
      ].flat();
      const authorizedGlobally = createTestDefinitions(testCases, false);

      (
        [
          ['user with no access', users.noAccess],
          ['legacy user', users.legacyAll],
          ['dual-privileges readonly user', users.dualRead],
          ['rbac user with read globally', users.readGlobally],
          ['user with read at the space', users.readAtSpace],
          ['user with all at other space', users.allAtOtherSpace],
        ] as const
      ).forEach(([description, user]) => {
        updateTest(`${description}${suffix}`, { user, spaceId, tests: unauthorized });
      });

      updateTest(`user with all at the space${suffix}`, {
        user: users.allAtSpace,
        spaceId,
        tests: authorizedThisSpace,
      });

      (
        [
          ['dual-privileges user', users.dualAll],
          ['rbac user with all globally', users.allGlobally],
          ['superuser', users.superuser],
        ] as const
      ).forEach(([description, user]) => {
        updateTest(`${description}${suffix}`, { user, spaceId, tests: authorizedGlobally });
      });
    });
  }
);
