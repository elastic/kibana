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
  createExpectAllPurposesResults,
  createExpectResults,
  expectRbacForbidden,
  getAllTest,
  type GetAllTests,
} from '../../suites/get_all';

const ALL_SPACES = ['default', 'space_1', 'space_2', 'space_3'] as const;

// Used to determine expected results for tests where the `include_authorized_purposes`
// option is enabled.
const authorizedAll = {
  any: true,
  copySavedObjectsIntoSpace: true,
  findSavedObjects: true,
  shareSavedObjectsIntoSpace: true,
};
const authorizedRead = {
  any: true,
  copySavedObjectsIntoSpace: false,
  findSavedObjects: true,
  shareSavedObjectsIntoSpace: false,
};

interface Scenario {
  spaceId: string;
  users: {
    noAccess: RoleName;
    allGlobally: RoleName;
    readGlobally: RoleName;
    allAtSpace1: RoleName;
    readAtSpace1: RoleName;
    allAtDefaultSpace: RoleName;
    readAtDefaultSpace: RoleName;
    readSavedObjectsAtDefaultSpace: RoleName;
    allSavedObjectsAtDefaultSpace: RoleName;
    readSavedObjectsAtSpace1: RoleName;
    allSavedObjectsAtSpace1: RoleName;
    legacyAll: RoleName;
    dualAll: RoleName;
    dualRead: RoleName;
  };
}

const commonUsers: Scenario['users'] = {
  noAccess: 'no_access',
  allGlobally: 'kibana_rbac_user',
  readGlobally: 'kibana_rbac_dashboard_only_user',
  allAtSpace1: 'kibana_rbac_space_1_all_user',
  readAtSpace1: 'kibana_rbac_space_1_read_user',
  allAtDefaultSpace: 'kibana_rbac_default_space_all_user',
  readAtDefaultSpace: 'kibana_rbac_default_space_read_user',
  readSavedObjectsAtDefaultSpace: 'kibana_rbac_default_space_saved_objects_read_user',
  allSavedObjectsAtDefaultSpace: 'kibana_rbac_default_space_saved_objects_all_user',
  readSavedObjectsAtSpace1: 'kibana_rbac_space_1_saved_objects_read_user',
  allSavedObjectsAtSpace1: 'kibana_rbac_space_1_saved_objects_all_user',
  legacyAll: 'kibana_legacy_user',
  dualAll: 'kibana_dual_privileges_user',
  dualRead: 'kibana_dual_privileges_dashboard_only_user',
};

const SCENARIOS: Scenario[] = [
  { spaceId: 'default', users: commonUsers },
  { spaceId: 'space_1', users: commonUsers },
];

const forbidden: GetAllTests = {
  exists: { statusCode: 403, response: expectRbacForbidden },
  copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
  shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
  includeAuthorizedPurposes: { statusCode: 403, response: expectRbacForbidden },
};

apiTest.describe('spaces api authorization - get all', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ kbnClient, config }) => {
    await createTestSpaces(kbnClient, config.serverless);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await deleteTestSpaces(kbnClient);
  });

  SCENARIOS.forEach(({ spaceId, users }) => {
    getAllTest(`user with no access can't access any spaces from ${spaceId}`, {
      spaceId,
      user: users.noAccess,
      tests: forbidden,
    });

    // Built-in ES roles without Kibana privileges must not be able to enumerate spaces.
    for (const builtInRole of [
      'machine_learning_admin',
      'machine_learning_user',
      'monitoring_user',
    ]) {
      getAllTest(`${builtInRole} can't access any spaces from ${spaceId}`, {
        spaceId,
        user: { builtInRole },
        tests: forbidden,
      });
    }

    getAllTest(`superuser can access all spaces from ${spaceId}`, {
      spaceId,
      user: 'superuser',
      tests: {
        exists: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedAll, ...ALL_SPACES),
        },
      },
    });

    getAllTest(`rbac user with all globally can access all spaces from ${spaceId}`, {
      spaceId,
      user: users.allGlobally,
      tests: {
        exists: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedAll, ...ALL_SPACES),
        },
      },
    });

    getAllTest(`dual-privileges user can access all spaces from ${spaceId}`, {
      spaceId,
      user: users.dualAll,
      tests: {
        exists: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedAll, ...ALL_SPACES),
        },
      },
    });

    getAllTest(`legacy user can't access any spaces from ${spaceId}`, {
      spaceId,
      user: users.legacyAll,
      tests: forbidden,
    });

    getAllTest(`rbac user with read globally can access all spaces from ${spaceId}`, {
      spaceId,
      user: users.readGlobally,
      tests: {
        exists: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedRead, ...ALL_SPACES),
        },
      },
    });

    getAllTest(`dual-privileges readonly user can access all spaces from ${spaceId}`, {
      spaceId,
      user: users.dualRead,
      tests: {
        exists: { statusCode: 200, response: createExpectResults(...ALL_SPACES) },
        copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedRead, ...ALL_SPACES),
        },
      },
    });

    getAllTest(`rbac user with all at space_1 can access space_1 from ${spaceId}`, {
      spaceId,
      user: users.allAtSpace1,
      tests: {
        exists: { statusCode: 200, response: createExpectResults('space_1') },
        copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults('space_1') },
        shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults('space_1') },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedAll, 'space_1'),
        },
      },
    });

    getAllTest(`rbac user with read at space_1 can access space_1 from ${spaceId}`, {
      spaceId,
      user: users.readAtSpace1,
      tests: {
        exists: { statusCode: 200, response: createExpectResults('space_1') },
        copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedRead, 'space_1'),
        },
      },
    });

    getAllTest(`rbac user with all at default space can access default from ${spaceId}`, {
      spaceId,
      user: users.allAtDefaultSpace,
      tests: {
        exists: { statusCode: 200, response: createExpectResults('default') },
        copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults('default') },
        shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults('default') },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedAll, 'default'),
        },
      },
    });

    getAllTest(`rbac user with read at default space can access default from ${spaceId}`, {
      spaceId,
      user: users.readAtDefaultSpace,
      tests: {
        exists: { statusCode: 200, response: createExpectResults('default') },
        copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
        includeAuthorizedPurposes: {
          statusCode: 200,
          response: createExpectAllPurposesResults(authorizedRead, 'default'),
        },
      },
    });

    getAllTest(
      `rbac user with saved objects management all at default space can access default from ${spaceId}`,
      {
        spaceId,
        user: users.allSavedObjectsAtDefaultSpace,
        tests: {
          exists: { statusCode: 200, response: createExpectResults('default') },
          copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults('default') },
          shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults('default') },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedAll, 'default'),
          },
        },
      }
    );

    getAllTest(
      `rbac user with saved objects management read at default space can access default from ${spaceId}`,
      {
        spaceId,
        user: users.readSavedObjectsAtDefaultSpace,
        tests: {
          exists: { statusCode: 200, response: createExpectResults('default') },
          copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
          shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedRead, 'default'),
          },
        },
      }
    );

    getAllTest(
      `rbac user with saved objects management all at space_1 space can access space_1 from ${spaceId}`,
      {
        spaceId,
        user: users.allSavedObjectsAtSpace1,
        tests: {
          exists: { statusCode: 200, response: createExpectResults('space_1') },
          copySavedObjectsPurpose: { statusCode: 200, response: createExpectResults('space_1') },
          shareSavedObjectsPurpose: { statusCode: 200, response: createExpectResults('space_1') },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedAll, 'space_1'),
          },
        },
      }
    );

    getAllTest(
      `rbac user with saved objects management read at space_1 space can access space_1 from ${spaceId}`,
      {
        spaceId,
        user: users.readSavedObjectsAtSpace1,
        tests: {
          exists: { statusCode: 200, response: createExpectResults('space_1') },
          copySavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
          shareSavedObjectsPurpose: { statusCode: 403, response: expectRbacForbidden },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedRead, 'space_1'),
          },
        },
      }
    );
  });
});
