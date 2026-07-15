/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import { loadEsArchive, unloadEsArchive } from '../../common/es_archive';
import {
  CASES,
  DEFAULT_SPACE_ID,
  SECURITY_AND_SPACES_SCENARIOS,
  SPACE_1_ID,
  SPACE_2_ID,
} from '../../common/multi_namespace';
import { SPACES_ES_ARCHIVE } from '../../constants';
import { apiTest } from '../../fixtures';
import {
  createTestDefinitions,
  type GetShareableReferencesTestCase,
  type ReferenceResult,
  shareableReferencesTest,
} from '../../suites/get_shareable_references';

const TEST_CASE_OBJECTS = {
  // contains references to four other objects
  SHAREABLE_TYPE: { type: 'index-pattern', id: CASES.EACH_SPACE.id },
  SHAREABLE_TYPE_DOES_NOT_EXIST: { type: 'index-pattern', id: 'does-not-exist' },
  // one of these exists in each space
  NON_SHAREABLE_TYPE: { type: 'url', id: 'my_isolated_object' },
} as const;

// `other_space` / `'*'` matching origins are seeded by the shared spaces ES archive.
const EXPECTED_RESULTS: Record<string, ReferenceResult[]> = {
  IN_DEFAULT_SPACE: [
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE,
      spaces: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      inboundReferences: [{ type: 'index-pattern', id: CASES.DEFAULT_ONLY.id, name: 'refname' }],
    },
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
      spaces: [],
      inboundReferences: [],
      isMissing: true,
    },
    { ...TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE, spaces: [], inboundReferences: [] },
    {
      type: 'index-pattern',
      id: CASES.DEFAULT_ONLY.id,
      spaces: [DEFAULT_SPACE_ID],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
    {
      type: 'index-pattern',
      id: CASES.SPACE_1_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true,
    },
    {
      type: 'index-pattern',
      id: CASES.SPACE_2_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true,
    },
    {
      type: 'index-pattern',
      id: CASES.ALL_SPACES.id,
      spaces: ['*'],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
  ],
  IN_SPACE_1: [
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE,
      spaces: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      inboundReferences: [{ type: 'index-pattern', id: CASES.SPACE_1_ONLY.id, name: 'refname' }],
    },
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
      spaces: [],
      inboundReferences: [],
      isMissing: true,
    },
    { ...TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE, spaces: [], inboundReferences: [] },
    {
      type: 'index-pattern',
      id: CASES.DEFAULT_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true,
    },
    {
      type: 'index-pattern',
      id: CASES.SPACE_1_ONLY.id,
      spaces: [SPACE_1_ID],
      spacesWithMatchingAliases: [DEFAULT_SPACE_ID, SPACE_2_ID],
      spacesWithMatchingOrigins: ['other_space'],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
    {
      type: 'index-pattern',
      id: CASES.SPACE_2_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true,
    },
    {
      type: 'index-pattern',
      id: CASES.ALL_SPACES.id,
      spaces: ['*'],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
  ],
};

const createTestCases = (spaceId: string): GetShareableReferencesTestCase[] => {
  const objects = [
    TEST_CASE_OBJECTS.SHAREABLE_TYPE,
    TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
    TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE,
  ];

  if (spaceId === DEFAULT_SPACE_ID) {
    return [{ objects, expectedResults: EXPECTED_RESULTS.IN_DEFAULT_SPACE }];
  }
  if (spaceId === SPACE_1_ID) {
    return [{ objects, expectedResults: EXPECTED_RESULTS.IN_SPACE_1 }];
  }
  throw new Error(`Unexpected test case for space '${spaceId}'!`);
};

apiTest.describe(
  'spaces api authorization - get shareable references',
  { tag: tags.stateful.all },
  () => {
    // `_get_shareable_references` is read-only, so the archive is seeded once for the
    // whole spec instead of per user-describe (the mutating share suites reload per block).
    apiTest.beforeAll(async ({ config }) => {
      await loadEsArchive(config.hosts.elasticsearch, SPACES_ES_ARCHIVE);
    });

    apiTest.afterAll(async ({ config }) => {
      await unloadEsArchive(config.hosts.elasticsearch, SPACES_ES_ARCHIVE);
    });

    SECURITY_AND_SPACES_SCENARIOS.forEach(({ spaceId, users }) => {
      const suffix = ` targeting the ${spaceId} space`;
      const testCases = createTestCases(spaceId);

      const unauthorized = createTestDefinitions(testCases, true);
      const authorizedThisSpace = createTestDefinitions(testCases, false, {
        authorizedSpace: spaceId,
      });
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
        shareableReferencesTest(`${description}${suffix}`, { user, spaceId, tests: unauthorized });
      });

      shareableReferencesTest(`user with all at the space${suffix}`, {
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
        shareableReferencesTest(`${description}${suffix}`, {
          user,
          spaceId,
          tests: authorizedGlobally,
        });
      });
    });
  }
);
