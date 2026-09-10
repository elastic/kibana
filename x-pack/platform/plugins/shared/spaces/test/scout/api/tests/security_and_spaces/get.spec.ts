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
  createExpectRbacForbidden,
  createExpectResults,
  expectNotFoundResult,
  getTest,
  NON_EXISTENT_SPACE_ID,
} from '../../suites/get';

interface Scenario {
  spaceId: string;
  otherSpaceId: string;
  readAtSpace: RoleName;
  allAtOtherSpace: RoleName;
}

const SCENARIOS: Scenario[] = [
  {
    spaceId: 'default',
    otherSpaceId: 'space_1',
    readAtSpace: 'kibana_rbac_default_space_read_user',
    allAtOtherSpace: 'kibana_rbac_space_1_all_user',
  },
  {
    spaceId: 'space_1',
    otherSpaceId: 'default',
    readAtSpace: 'kibana_rbac_space_1_read_user',
    allAtOtherSpace: 'kibana_rbac_default_space_all_user',
  },
  {
    // This space has a solution set and we expect disabledFeatures to be automatically set.
    spaceId: 'space_3',
    otherSpaceId: 'default',
    readAtSpace: 'kibana_rbac_space_3_read_user',
    allAtOtherSpace: 'kibana_rbac_default_space_all_user',
  },
];

apiTest.describe('spaces api authorization - get', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ kbnClient, config }) => {
    await createTestSpaces(kbnClient, config.serverless);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await deleteTestSpaces(kbnClient);
  });

  SCENARIOS.forEach(({ spaceId, otherSpaceId, readAtSpace, allAtOtherSpace }) => {
    const forbidden = { statusCode: 403, response: createExpectRbacForbidden(spaceId) };
    const allowed = { statusCode: 200, response: createExpectResults(spaceId) };

    getTest(`user with no access (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'no_access',
      tests: { default: forbidden },
    });

    getTest(`superuser (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'superuser',
      tests: { default: allowed },
    });

    getTest(`rbac user with all globally (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'kibana_rbac_user',
      tests: { default: allowed },
    });

    getTest(`dual-privileges user (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'kibana_dual_privileges_user',
      tests: { default: allowed },
    });

    getTest(`legacy user (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'kibana_legacy_user',
      tests: { default: forbidden },
    });

    getTest(`rbac user with read globally (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'kibana_rbac_dashboard_only_user',
      tests: { default: allowed },
    });

    getTest(`dual-privileges readonly user (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: 'kibana_dual_privileges_dashboard_only_user',
      tests: { default: allowed },
    });

    getTest(`rbac user with read at space (get ${spaceId})`, {
      currentSpaceId: spaceId,
      spaceId,
      user: readAtSpace,
      tests: { default: allowed },
    });

    getTest(`rbac user with all at other space (get ${spaceId} from ${otherSpaceId})`, {
      currentSpaceId: otherSpaceId,
      spaceId,
      user: allAtOtherSpace,
      tests: { default: forbidden },
    });
  });

  // Non-existent space rows. Not wrapped in a nested `describe` (getTest already creates
  // one per row, and `playwright/max-nested-describe` allows a single level in this file).
  {
    const currentSpaceId = 'default';
    const spaceId = NON_EXISTENT_SPACE_ID;
    const notFound = { statusCode: 404, response: expectNotFoundResult };
    const forbidden = { statusCode: 403, response: createExpectRbacForbidden(spaceId) };

    getTest(`superuser (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'superuser',
      tests: { default: notFound },
    });

    getTest(`rbac user with all globally (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'kibana_rbac_user',
      tests: { default: notFound },
    });

    getTest(`dual-privileges user (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'kibana_dual_privileges_user',
      tests: { default: notFound },
    });

    getTest(`legacy user (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'kibana_legacy_user',
      tests: { default: forbidden },
    });

    getTest(`rbac user with read globally (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'kibana_rbac_dashboard_only_user',
      tests: { default: notFound },
    });

    getTest(`dual-privileges readonly user (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'kibana_dual_privileges_dashboard_only_user',
      tests: { default: notFound },
    });

    getTest(`rbac user with all at default space (get ${spaceId})`, {
      currentSpaceId,
      spaceId,
      user: 'kibana_rbac_default_space_all_user',
      tests: { default: forbidden },
    });
  }
});
