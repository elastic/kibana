/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import type { RoleName } from '../../common/roles';
import { loadSavedObjects, unloadSavedObjects } from '../../common/saved_objects';
import { createTestSpaces, deleteTestSpaces } from '../../common/spaces';
import { apiTest } from '../../fixtures';
import {
  deleteTest,
  type DeleteTests,
  expectEmptyResult,
  expectNotFound,
  expectRbacForbidden,
  expectReservedSpaceResult,
} from '../../suites/delete';

const allForbidden: DeleteTests = {
  exists: { statusCode: 403, response: expectRbacForbidden },
  reservedSpace: { statusCode: 403, response: expectRbacForbidden },
  doesntExist: { statusCode: 403, response: expectRbacForbidden },
};

const allAllowed: DeleteTests = {
  exists: { statusCode: 204, response: expectEmptyResult },
  reservedSpace: { statusCode: 400, response: expectReservedSpaceResult },
  doesntExist: { statusCode: 404, response: expectNotFound },
};

const SCENARIOS: Array<{ spaceId: string; allAtSpace: RoleName }> = [
  { spaceId: 'default', allAtSpace: 'kibana_rbac_default_space_all_user' },
  { spaceId: 'space_1', allAtSpace: 'kibana_rbac_space_1_all_user' },
];

apiTest.describe('spaces api authorization - delete', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ kbnClient, config }) => {
    await createTestSpaces(kbnClient, config.serverless);
    await loadSavedObjects(kbnClient);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await deleteTestSpaces(kbnClient);
    await unloadSavedObjects(kbnClient);
    await kbnClient.savedObjects.cleanStandardList();
  });

  SCENARIOS.forEach(({ spaceId, allAtSpace }) => {
    deleteTest(`user with no access from the ${spaceId} space`, {
      spaceId,
      user: 'no_access',
      tests: allForbidden,
    });

    deleteTest(`superuser from the ${spaceId} space`, {
      spaceId,
      user: 'superuser',
      tests: allAllowed,
    });

    deleteTest(`rbac user with all globally from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_rbac_user',
      tests: allAllowed,
    });

    deleteTest(`dual-privileges user from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_dual_privileges_user',
      tests: allAllowed,
    });

    deleteTest(`legacy user from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_legacy_user',
      tests: allForbidden,
    });

    deleteTest(`rbac user with read globally from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_rbac_dashboard_only_user',
      tests: allForbidden,
    });

    deleteTest(`dual-privileges readonly user from the ${spaceId} space`, {
      spaceId,
      user: 'kibana_dual_privileges_dashboard_only_user',
      tests: allForbidden,
    });

    deleteTest(`rbac user with all at space from the ${spaceId} space`, {
      spaceId,
      user: allAtSpace,
      tests: allForbidden,
    });
  });
});
