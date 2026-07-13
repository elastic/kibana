/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import type { RoleName } from '../../common/roles';
import { createTestSpaces, deleteTestSpaces } from '../../common/spaces';
import { apiTest } from '../../fixtures';
import {
  createTest,
  type CreateTests,
  expectConflictResponse,
  expectNewSpaceResult,
  expectRbacForbiddenResponse,
  expectReservedSpecifiedResult,
  expectSolutionSpecifiedResult,
} from '../../suites/create';

const allForbidden: CreateTests = {
  newSpace: { statusCode: 403, response: expectRbacForbiddenResponse },
  alreadyExists: { statusCode: 403, response: expectRbacForbiddenResponse },
  reservedSpecified: { statusCode: 403, response: expectRbacForbiddenResponse },
  solutionSpecified: { statusCode: 403, response: expectRbacForbiddenResponse },
};

const allAllowed: CreateTests = {
  newSpace: { statusCode: 200, response: expectNewSpaceResult },
  alreadyExists: { statusCode: 409, response: expectConflictResponse },
  reservedSpecified: { statusCode: 200, response: expectReservedSpecifiedResult },
  solutionSpecified: { statusCode: 200, response: expectSolutionSpecifiedResult },
};

const SCENARIOS: Array<{ spaceId: string; allAtSpace: RoleName }> = [
  { spaceId: 'default', allAtSpace: 'kibana_rbac_default_space_all_user' },
  { spaceId: 'space_1', allAtSpace: 'kibana_rbac_space_1_all_user' },
];

// Transient spaces created (and normally deleted) by individual matrix cases.
// Cleaned up defensively so a previously interrupted run cannot leave a
// leftover space that would turn an expected 200 into a 409.
const TRANSIENT_SPACE_IDS = ['marketing', 'reserved', 'solution'];

apiTest.describe('spaces api authorization - create', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ apiServices, kbnClient, config }) => {
    for (const id of TRANSIENT_SPACE_IDS) {
      await apiServices.spaces.delete(id);
    }
    await createTestSpaces(kbnClient, config.serverless);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await deleteTestSpaces(kbnClient);
  });

  SCENARIOS.forEach(({ spaceId, allAtSpace }) => {
    createTest(`user with no access from the ${spaceId} space`, {
      spaceId,
      user: 'no_access',
      tests: allForbidden,
    });

    createTest(`superuser from the ${spaceId} space`, {
      spaceId,
      user: 'superuser',
      tests: allAllowed,
    });

    createTest(`rbac user with all globally from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_rbac_user',
      tests: allAllowed,
    });

    createTest(`dual-privileges user from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_dual_privileges_user',
      tests: allAllowed,
    });

    createTest(`legacy user from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_legacy_user',
      tests: allForbidden,
    });

    createTest(`rbac user with read globally from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_rbac_dashboard_only_user',
      tests: allForbidden,
    });

    createTest(`dual-privileges readonly user from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_dual_privileges_dashboard_only_user',
      tests: allForbidden,
    });

    createTest(`rbac user with all at space from the ${spaceId} space`, {
      spaceId,
      user: allAtSpace,
      tests: allForbidden,
    });
  });
});
