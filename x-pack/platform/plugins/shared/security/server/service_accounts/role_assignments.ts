/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProjectContext } from './types';
import type { UiamRoleAssignments } from '../uiam';

/**
 * The Cloud role UIAM defines for granting application roles on projects of one type and nothing
 * else. Sending any other `role_id` would also ask for control-plane privileges, which a Kibana
 * workload has no use for.
 */
const getApplicationOnlyRoleId = (projectType: CloudProjectContext['projectType']): string =>
  `${projectType}-application-only`;

/**
 * Builds the role assignments Kibana sends when creating a UIAM service account with the given
 * application roles. UIAM stores them as the account's roles and records the creator's own role
 * assignments as its ceiling, so the account can never do more than its creator could when it
 * was created.
 *
 * The assignment covers this project only. The roles do not apply on linked projects, so the
 * account does not take part in cross-project search.
 */
export const buildRoleAssignments = (
  { organizationId, projectId, projectType }: CloudProjectContext,
  roles: string[]
): UiamRoleAssignments => ({
  project: {
    [projectType]: [
      {
        role_id: getApplicationOnlyRoleId(projectType),
        organization_id: organizationId,
        all: false,
        project_ids: [projectId],
        application_roles: roles,
      },
    ],
  },
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
