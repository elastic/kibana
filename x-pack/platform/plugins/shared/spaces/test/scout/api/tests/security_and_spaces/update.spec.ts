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
  expectAlreadyExistsResult,
  expectDefaultSpaceResult,
  expectNotFound,
  expectRbacForbidden,
  updateTest,
  type UpdateTests,
} from '../../suites/update';

const allForbidden: UpdateTests = {
  alreadyExists: { statusCode: 403, response: expectRbacForbidden },
  defaultSpace: { statusCode: 403, response: expectRbacForbidden },
  newSpace: { statusCode: 403, response: expectRbacForbidden },
};

const allAllowed: UpdateTests = {
  alreadyExists: { statusCode: 200, response: expectAlreadyExistsResult },
  defaultSpace: { statusCode: 200, response: expectDefaultSpaceResult },
  newSpace: { statusCode: 404, response: expectNotFound },
};

const SPACE_IDS = ['default', 'space_1'];

const MATRIX: Array<{ label: string; user: RoleName; tests: UpdateTests }> = [
  { label: 'user with no access', user: 'no_access', tests: allForbidden },
  { label: 'superuser', user: 'superuser', tests: allAllowed },
  { label: 'rbac user with all globally', user: 'kibana_rbac_user', tests: allAllowed },
  { label: 'dual-privileges user', user: 'kibana_dual_privileges_user', tests: allAllowed },
  { label: 'legacy user', user: 'kibana_legacy_user', tests: allForbidden },
  {
    label: 'rbac user with read globally',
    user: 'kibana_rbac_dashboard_only_user',
    tests: allForbidden,
  },
  {
    label: 'dual-privileges readonly user',
    user: 'kibana_dual_privileges_dashboard_only_user',
    tests: allForbidden,
  },
  {
    label: 'rbac user with all at space',
    user: 'kibana_rbac_space_1_all_user',
    tests: allForbidden,
  },
  {
    label: 'rbac user with read at space',
    user: 'kibana_rbac_space_1_read_user',
    tests: allForbidden,
  },
];

apiTest.describe('spaces api authorization - update', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ kbnClient, config }) => {
    await createTestSpaces(kbnClient, config.serverless);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await deleteTestSpaces(kbnClient);
    // The matrix mutates the (non-deletable) default space; restore its canonical state
    // so later specs that read the default space are not affected.
    await kbnClient.request({
      method: 'PUT',
      path: '/api/spaces/space/default',
      body: {
        id: 'default',
        name: 'Default',
        description: 'This is your default space!',
        color: '#00bfb3',
        disabledFeatures: [],
      },
    });
  });

  SPACE_IDS.forEach((spaceId) => {
    MATRIX.forEach(({ label, user, tests }) => {
      updateTest(`${label} from the ${spaceId} space`, { spaceId, user, tests });
    });
  });
});
