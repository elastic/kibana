/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProjectContext } from './types';
import type { UiamRoleAssignments } from '../uiam';

/**
 * The suffix UIAM puts on the Cloud role that grants a project's application roles and nothing
 * else. Sending any other `role_id` would also ask for control-plane privileges, which a Kibana
 * workload has no use for.
 */
const APPLICATION_ONLY_ROLE_SUFFIX = '-application-only';

/**
 * Builds the role assignments Kibana sends when creating a UIAM service account with the given
 * application roles. UIAM stores them as the account's roles and records the creator's own role
 * assignments as its ceiling, so the account can never do more than its creator could when it
 * was created.
 *
 * The assignment is scoped to every project of this project's type in the organization, not to
 * this project alone, so the account can take part in cross-project search among them the way a
 * user with the same roles would: on each such project the named roles apply if they exist there,
 * and the creator's own reach there is the ceiling. It does not reach linked projects of another
 * type. UIAM keys project role assignments by type, and the application-only role is per type
 * too. An organization-wide equivalent (`organization-application-only`) is being added in
 * https://github.com/elastic/uiam-commons/pull/321, and a per-project selection would become
 * further entries in the same list.
 */
export const buildRoleAssignments = (
  { organizationId, projectType }: CloudProjectContext,
  roles: string[]
): UiamRoleAssignments => ({
  project: {
    [projectType]: [
      {
        role_id: `${projectType}${APPLICATION_ONLY_ROLE_SUFFIX}`,
        organization_id: organizationId,
        all: true,
        application_roles: roles,
      },
    ],
  },
});
