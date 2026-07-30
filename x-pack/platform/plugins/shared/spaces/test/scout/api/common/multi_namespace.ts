/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleName } from './roles';

/**
 * Multi-namespace saved objects seeded by the shared spaces ES archive
 * (`SPACES_ES_ARCHIVE`).
 */
export const CASES = {
  DEFAULT_ONLY: { id: 'default_only', existingNamespaces: ['default'] },
  SPACE_1_ONLY: { id: 'space_1_only', existingNamespaces: ['space_1'] },
  SPACE_2_ONLY: { id: 'space_2_only', existingNamespaces: ['space_2'] },
  DEFAULT_AND_SPACE_1: { id: 'default_and_space_1', existingNamespaces: ['default', 'space_1'] },
  DEFAULT_AND_SPACE_2: { id: 'default_and_space_2', existingNamespaces: ['default', 'space_2'] },
  SPACE_1_AND_SPACE_2: { id: 'space_1_and_space_2', existingNamespaces: ['space_1', 'space_2'] },
  EACH_SPACE: { id: 'each_space', existingNamespaces: ['default', 'space_1', 'space_2'] },
  ALL_SPACES: { id: 'all_spaces', existingNamespaces: ['*'] },
  ALIAS_DELETE_INCLUSIVE: {
    id: 'alias_delete_inclusive',
    existingNamespaces: ['default', 'space_1', 'space_2'],
  },
  ALIAS_DELETE_EXCLUSIVE: { id: 'alias_delete_exclusive', existingNamespaces: ['*'] },
  DOES_NOT_EXIST: { id: 'does_not_exist', existingNamespaces: [] as string[] },
} as const;

export const DEFAULT_SPACE_ID = 'default';
export const SPACE_1_ID = 'space_1';
export const SPACE_2_ID = 'space_2';

export const fail404 = (condition?: boolean): { failure?: 404 } =>
  condition !== false ? { failure: 404 } : {};

/**
 * The subset of the `securityAndSpaces` user matrix exercised by the
 * multi-namespace suites. The `allAtSpace` / `readAtSpace` / `allAtOtherSpace`
 * roles are relative to the space under test, so each scenario resolves them to
 * the appropriate concrete role.
 */
export interface MultiNamespaceUsers {
  noAccess: RoleName;
  superuser: RoleName;
  legacyAll: RoleName;
  allGlobally: RoleName;
  readGlobally: RoleName;
  dualAll: RoleName;
  dualRead: RoleName;
  allAtSpace: RoleName;
  readAtSpace: RoleName;
  allAtOtherSpace: RoleName;
}

const commonUsers = {
  noAccess: 'no_access',
  superuser: 'superuser',
  legacyAll: 'kibana_legacy_user',
  allGlobally: 'kibana_rbac_user',
  readGlobally: 'kibana_rbac_dashboard_only_user',
  dualAll: 'kibana_dual_privileges_user',
  dualRead: 'kibana_dual_privileges_dashboard_only_user',
} satisfies Partial<MultiNamespaceUsers>;

export interface MultiNamespaceScenario {
  spaceId: string;
  users: MultiNamespaceUsers;
}

/**
 * The `securityAndSpaces` scenarios (default + space_1 rows).
 */
export const SECURITY_AND_SPACES_SCENARIOS: MultiNamespaceScenario[] = [
  {
    spaceId: DEFAULT_SPACE_ID,
    users: {
      ...commonUsers,
      allAtSpace: 'kibana_rbac_default_space_all_user',
      readAtSpace: 'kibana_rbac_default_space_read_user',
      allAtOtherSpace: 'kibana_rbac_space_1_all_user',
    },
  },
  {
    spaceId: SPACE_1_ID,
    users: {
      ...commonUsers,
      allAtSpace: 'kibana_rbac_space_1_all_user',
      readAtSpace: 'kibana_rbac_space_1_read_user',
      allAtOtherSpace: 'kibana_rbac_default_space_all_user',
    },
  },
];
