/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import { SECURITY_AND_SPACES_SCENARIOS } from '../../common/multi_namespace';
import type { RoleName } from '../../common/roles';
import { apiTest } from '../../fixtures';
import {
  createExpectNonOverriddenResponseWithoutReferences,
  createExpectNonOverriddenResponseWithReferences,
  createExpectOverriddenResponseWithoutReferences,
  createExpectOverriddenResponseWithReferences,
  createExpectUnauthorizedAtSpaceWithoutReferencesResult,
  createExpectUnauthorizedAtSpaceWithReferencesResult,
  createMultiNamespaceTestCases,
  expectRouteForbiddenResponse,
  NON_EXISTENT_SPACE_ID,
  resolveCopyToSpaceConflictsTest,
  type ResolveCopyToSpaceTests,
  type ResolveMultiNamespaceOutcome,
} from '../../suites/resolve_copy_to_space_conflicts';
import { resolveCopyToSpaceConflictsMultiNamespaceTest } from '../../suites/resolve_copy_to_space_conflicts_multi_namespace';

const noAccessTests = (): ResolveCopyToSpaceTests => ({
  withReferencesNotOverwriting: { statusCode: 403, response: expectRouteForbiddenResponse },
  withReferencesOverwriting: { statusCode: 403, response: expectRouteForbiddenResponse },
  withoutReferencesOverwriting: { statusCode: 403, response: expectRouteForbiddenResponse },
  withoutReferencesNotOverwriting: { statusCode: 403, response: expectRouteForbiddenResponse },
  nonExistentSpace: { statusCode: 403, response: expectRouteForbiddenResponse },
});

// Unlike the copy suite (whose multi-namespace exact-match case branches on unauthorizedRead
// vs unauthorizedWrite), the resolve suite treats both outcomes identically for the
// single-namespace cases; the outcome only affects the multi-namespace group titles.
const unauthorizedTests = (spaceId: string): ResolveCopyToSpaceTests => ({
  withReferencesNotOverwriting: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId),
  },
  withReferencesOverwriting: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId),
  },
  withoutReferencesOverwriting: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId),
  },
  withoutReferencesNotOverwriting: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId),
  },
  nonExistentSpace: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
      spaceId,
      NON_EXISTENT_SPACE_ID
    ),
  },
});

const authorizedTests = (spaceId: string): ResolveCopyToSpaceTests => ({
  withReferencesNotOverwriting: {
    statusCode: 200,
    response: createExpectNonOverriddenResponseWithReferences(spaceId),
  },
  withReferencesOverwriting: {
    statusCode: 200,
    response: createExpectOverriddenResponseWithReferences(spaceId),
  },
  withoutReferencesOverwriting: {
    statusCode: 200,
    response: createExpectOverriddenResponseWithoutReferences(spaceId),
  },
  withoutReferencesNotOverwriting: {
    statusCode: 200,
    response: createExpectNonOverriddenResponseWithoutReferences(spaceId),
  },
  nonExistentSpace: {
    statusCode: 200,
    response: createExpectOverriddenResponseWithoutReferences(spaceId, NON_EXISTENT_SPACE_ID),
  },
});

/**
 * Registers both case groups for one user: the single-namespace group (per-test data
 * reload) plus the multi-namespace "overwrite" retry group (per-group data reload).
 */
const registerResolveTests = (
  description: string,
  spaceId: string,
  user: RoleName,
  tests: ResolveCopyToSpaceTests,
  outcome: ResolveMultiNamespaceOutcome
) => {
  resolveCopyToSpaceConflictsTest(description, { spaceId, user, tests });
  resolveCopyToSpaceConflictsMultiNamespaceTest(description, {
    spaceId,
    user,
    cases: createMultiNamespaceTestCases(spaceId, outcome)(),
  });
};

// The single root describe is required by `@kbn/eslint/scout_max_one_describe` for CI
// auto-skip. The factories instantiate one describe per user × case group inside it.
apiTest.describe(
  'spaces api authorization - resolve copy to space conflicts',
  { tag: tags.stateful.all },
  () => {
    for (const { spaceId, users } of SECURITY_AND_SPACES_SCENARIOS) {
      registerResolveTests(
        `user with no access from the ${spaceId} space`,
        spaceId,
        users.noAccess,
        noAccessTests(),
        'noAccess'
      );
      // The superuser variant runs under the trial config and asserts the
      // fully-authorized outcomes.
      registerResolveTests(
        `superuser from the ${spaceId} space`,
        spaceId,
        users.superuser,
        authorizedTests(spaceId),
        'authorized'
      );
      registerResolveTests(
        `rbac user with all globally from the ${spaceId} space`,
        spaceId,
        users.allGlobally,
        authorizedTests(spaceId),
        'authorized'
      );
      registerResolveTests(
        `dual-privileges user from the ${spaceId} space`,
        spaceId,
        users.dualAll,
        authorizedTests(spaceId),
        'authorized'
      );
      registerResolveTests(
        `legacy user from the ${spaceId} space`,
        spaceId,
        users.legacyAll,
        noAccessTests(),
        'noAccess'
      );
      registerResolveTests(
        `rbac user with read globally from the ${spaceId} space`,
        spaceId,
        users.readGlobally,
        unauthorizedTests(spaceId),
        'unauthorizedWrite'
      );
      registerResolveTests(
        `dual-privileges readonly user from the ${spaceId} space`,
        spaceId,
        users.dualRead,
        unauthorizedTests(spaceId),
        'unauthorizedWrite'
      );
      registerResolveTests(
        `rbac user with all at space from the ${spaceId} space`,
        spaceId,
        users.allAtSpace,
        unauthorizedTests(spaceId),
        'unauthorizedRead'
      );
    }
  }
);
