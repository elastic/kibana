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
  copyToSpaceTest,
  type CopyToSpaceTests,
  createExpectUnauthorizedAtSpaceWithoutReferencesResult,
  createExpectUnauthorizedAtSpaceWithReferencesResult,
  createExpectWithConflictsOverwritingResult,
  createExpectWithConflictsWithoutOverwritingResult,
  createMultiNamespaceTestCases,
  expectNoConflictsForNonExistentSpaceResult,
  expectNoConflictsWithoutReferencesResult,
  expectNoConflictsWithReferencesResult,
  expectRouteForbiddenResponse,
  type MultiNamespaceOutcome,
} from '../../suites/copy_to_space';
import {
  copyToSpaceMultiNamespaceTest,
  MULTI_NAMESPACE_COMBOS,
} from '../../suites/copy_to_space_multi_namespace';

// NOTE: no superuser row here — superuser copy coverage lives only in the basic-license
// variant, which is intentionally deferred.

const noAccessTests = (): CopyToSpaceTests => ({
  noConflictsWithoutReferences: { statusCode: 403, response: expectRouteForbiddenResponse },
  noConflictsWithReferences: { statusCode: 403, response: expectRouteForbiddenResponse },
  withConflictsOverwriting: { statusCode: 403, response: expectRouteForbiddenResponse },
  withConflictsWithoutOverwriting: { statusCode: 403, response: expectRouteForbiddenResponse },
  multipleSpaces: {
    statusCode: 403,
    withConflictsResponse: expectRouteForbiddenResponse,
    noConflictsResponse: expectRouteForbiddenResponse,
  },
  nonExistentSpace: { statusCode: 403, response: expectRouteForbiddenResponse },
});

// In *this* test suite, a user who is unauthorized to write (but authorized to read) in the
// destination space gets the same results as a user who is unauthorized to read there for
// the single-namespace cases; the distinction only matters for the multi-namespace cases,
// where it is expressed via the `outcome` passed to `registerCopyTests`.
const unauthorizedTests = (spaceId: string): CopyToSpaceTests => ({
  noConflictsWithoutReferences: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId, 'without-conflicts'),
  },
  noConflictsWithReferences: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId, 'without-conflicts'),
  },
  withConflictsOverwriting: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId, 'with-conflicts'),
  },
  withConflictsWithoutOverwriting: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId, 'with-conflicts'),
  },
  multipleSpaces: {
    statusCode: 200,
    withConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
      spaceId,
      'with-conflicts'
    ),
    noConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
      spaceId,
      'without-conflicts'
    ),
  },
  nonExistentSpace: {
    statusCode: 200,
    response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId, 'non-existent'),
  },
});

const authorizedTests = (spaceId: string): CopyToSpaceTests => ({
  noConflictsWithoutReferences: {
    statusCode: 200,
    response: expectNoConflictsWithoutReferencesResult(spaceId),
  },
  noConflictsWithReferences: {
    statusCode: 200,
    response: expectNoConflictsWithReferencesResult(spaceId),
  },
  withConflictsOverwriting: {
    statusCode: 200,
    response: createExpectWithConflictsOverwritingResult(spaceId),
  },
  withConflictsWithoutOverwriting: {
    statusCode: 200,
    response: createExpectWithConflictsWithoutOverwritingResult(spaceId),
  },
  multipleSpaces: {
    statusCode: 200,
    withConflictsResponse: createExpectWithConflictsOverwritingResult(spaceId),
    noConflictsResponse: expectNoConflictsWithReferencesResult(spaceId),
  },
  nonExistentSpace: {
    statusCode: 200,
    response: expectNoConflictsForNonExistentSpaceResult(spaceId),
  },
});

/**
 * Registers the full set of case groups for one user: the single-namespace group (per-test
 * data reload) plus one multi-namespace group per (overwrite, createNewCopies) combo
 * (per-group data reload).
 */
const registerCopyTests = (
  description: string,
  spaceId: string,
  user: RoleName,
  tests: CopyToSpaceTests,
  outcome: MultiNamespaceOutcome
) => {
  copyToSpaceTest(description, { spaceId, user, tests });

  const makeCases = createMultiNamespaceTestCases(spaceId, outcome);
  for (const { overwrite, createNewCopies } of MULTI_NAMESPACE_COMBOS) {
    copyToSpaceMultiNamespaceTest(description, {
      spaceId,
      user,
      overwrite,
      createNewCopies,
      cases: makeCases(overwrite, createNewCopies),
    });
  }
};

// The single root describe is required by `@kbn/eslint/scout_max_one_describe` for CI
// auto-skip. The factories instantiate one describe per user × case group inside it.
apiTest.describe('spaces api authorization - copy to space', { tag: tags.stateful.all }, () => {
  for (const { spaceId, users } of SECURITY_AND_SPACES_SCENARIOS) {
    registerCopyTests(
      `user with no access from the ${spaceId} space`,
      spaceId,
      users.noAccess,
      noAccessTests(),
      'noAccess'
    );
    registerCopyTests(
      `rbac user with all globally from the ${spaceId} space`,
      spaceId,
      users.allGlobally,
      authorizedTests(spaceId),
      'authorized'
    );
    registerCopyTests(
      `dual-privileges user from the ${spaceId} space`,
      spaceId,
      users.dualAll,
      authorizedTests(spaceId),
      'authorized'
    );
    registerCopyTests(
      `legacy user from the ${spaceId} space`,
      spaceId,
      users.legacyAll,
      noAccessTests(),
      'noAccess'
    );
    registerCopyTests(
      `rbac user with read globally from the ${spaceId} space`,
      spaceId,
      users.readGlobally,
      unauthorizedTests(spaceId),
      'unauthorizedWrite'
    );
    registerCopyTests(
      `dual-privileges readonly user from the ${spaceId} space`,
      spaceId,
      users.dualRead,
      unauthorizedTests(spaceId),
      'unauthorizedWrite'
    );
    registerCopyTests(
      `rbac user with all at space from the ${spaceId} space`,
      spaceId,
      users.allAtSpace,
      unauthorizedTests(spaceId),
      'unauthorizedRead'
    );
  }
});
