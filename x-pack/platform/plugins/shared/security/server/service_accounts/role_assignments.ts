/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProjectContext } from './types';
import type { UiamRoleAssignments } from '../uiam';

/**
 * The Cloud role UIAM defines for granting application roles across an organization and nothing
 * else. Sending any other `role_id` would also ask for control-plane privileges, which a Kibana
 * workload has no use for.
 */
const ORGANIZATION_APPLICATION_ONLY_ROLE = 'organization-application-only';

/**
 * Builds the role assignments Kibana sends when creating a UIAM service account with the given
 * application roles. UIAM stores them as the account's roles and records the creator's own role
 * assignments as its ceiling, so the account can never do more than its creator could when it
 * was created.
 *
 * The assignment is scoped to the whole organization, not to this project alone, so the account
 * can take part in cross-project search the way a user with the same roles would. On each linked
 * project, of any type, the named roles apply if they exist there, and the creator's own reach
 * there is the ceiling. A per-project selection would become project-scoped entries alongside
 * this one.
 */
export const buildRoleAssignments = (
  { organizationId }: Pick<CloudProjectContext, 'organizationId'>,
  roles: string[]
): UiamRoleAssignments => ({
  organization: [
    {
      role_id: ORGANIZATION_APPLICATION_ONLY_ROLE,
      organization_id: organizationId,
      application_roles: roles,
    },
  ],
});

/**
 * Reads the application roles an account holds on this project out of the role assignments UIAM
 * reports for it, in the order UIAM lists them and without duplicates.
 *
 * Organization entries apply on every project, and project entries only on the projects they
 * cover. An account created before Kibana sent application roles carries none, so it reads as
 * having no roles even though it acts with its creator's application privileges.
 */
export const readApplicationRoles = (
  { projectId, projectType }: Pick<CloudProjectContext, 'projectId' | 'projectType'>,
  { organization = [], project = {} }: UiamRoleAssignments
): string[] => {
  const projectEntries = (project[projectType] ?? []).filter(
    ({ all, project_ids: projectIds = [] }) => all || projectIds.includes(projectId)
  );

  return Array.from(
    new Set(
      [...organization, ...projectEntries].flatMap(
        ({ application_roles: applicationRoles = [] }) => applicationRoles
      )
    )
  );
};
