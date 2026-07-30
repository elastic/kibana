/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import { DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID } from '../../common/multi_namespace';
import type { RoleName } from '../../common/roles';
import { apiTest } from '../../fixtures';
import {
  createTestDefinitions,
  type DisableLegacyUrlAliasesTestCase,
  disableTest,
  TEST_CASE_SOURCE_ID,
  TEST_CASE_TARGET_TYPE,
} from '../../suites/disable_legacy_url_aliases';

const baseCase = { targetType: TEST_CASE_TARGET_TYPE, sourceId: TEST_CASE_SOURCE_ID };

// alias exists in the default space and space_2 (should be disabled); it does not exist in space_1.
const testCases: Record<string, DisableLegacyUrlAliasesTestCase> = {
  [DEFAULT_SPACE_ID]: { ...baseCase, targetSpace: DEFAULT_SPACE_ID, expectFound: true },
  [SPACE_1_ID]: { ...baseCase, targetSpace: SPACE_1_ID, expectFound: false },
  [SPACE_2_ID]: { ...baseCase, targetSpace: SPACE_2_ID, expectFound: true },
};

apiTest.describe(
  'spaces api authorization - disable legacy url aliases',
  { tag: tags.stateful.all },
  () => {
    // These users are unauthorized to disable aliases in any of the three target spaces.
    const unauthorizedUsers: Array<[string, RoleName]> = [
      ['user with no access', 'no_access'],
      ['legacy user', 'kibana_legacy_user'],
      ['dual-privileges readonly user', 'kibana_dual_privileges_dashboard_only_user'],
      ['rbac user with read globally', 'kibana_rbac_dashboard_only_user'],
      ['rbac user with read at default space', 'kibana_rbac_default_space_read_user'],
      ['rbac user with read at space_1', 'kibana_rbac_space_1_read_user'],
    ];

    unauthorizedUsers.forEach(([description, user]) => {
      disableTest(description, {
        user,
        tests: createTestDefinitions(Object.values(testCases), true),
      });
    });

    disableTest('rbac user with all at default space', {
      user: 'kibana_rbac_default_space_all_user',
      tests: [
        ...createTestDefinitions(testCases[DEFAULT_SPACE_ID], false),
        ...createTestDefinitions([testCases[SPACE_1_ID], testCases[SPACE_2_ID]], true),
      ],
    });

    disableTest('rbac user with all at space_1', {
      user: 'kibana_rbac_space_1_all_user',
      tests: [
        ...createTestDefinitions(testCases[SPACE_1_ID], false),
        ...createTestDefinitions([testCases[DEFAULT_SPACE_ID], testCases[SPACE_2_ID]], true),
      ],
    });

    // These users are authorized to disable aliases everywhere.
    const authorizedGloballyUsers: Array<[string, RoleName]> = [
      ['dual-privileges user', 'kibana_dual_privileges_user'],
      ['rbac user with all globally', 'kibana_rbac_user'],
      ['superuser', 'superuser'],
    ];

    authorizedGloballyUsers.forEach(([description, user]) => {
      disableTest(description, {
        user,
        tests: createTestDefinitions(Object.values(testCases), false),
      });
    });
  }
);
