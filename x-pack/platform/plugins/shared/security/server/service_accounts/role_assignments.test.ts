/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRoleAssignments, readApplicationRoles } from './role_assignments';
import type { UiamProjectRoleAssignment } from '../uiam';

describe('readApplicationRoles', () => {
  const context = {
    organizationId: 'organization-id',
    projectId: 'project-id',
    projectType: 'security' as const,
  };

  const projectEntry = (
    entry: Partial<UiamProjectRoleAssignment> & Pick<UiamProjectRoleAssignment, 'all'>
  ): UiamProjectRoleAssignment => ({
    role_id: 'security-custom',
    organization_id: 'organization-id',
    ...entry,
  });

  it('reads back the roles `buildRoleAssignments` sends', () => {
    expect(
      readApplicationRoles(context, buildRoleAssignments(context, ['viewer', 'editor']))
    ).toEqual(['viewer', 'editor']);
  });

  it('includes project entries that cover this project, by id or by `all`', () => {
    expect(
      readApplicationRoles(context, {
        project: {
          security: [
            projectEntry({ all: false, project_ids: ['project-id'], application_roles: ['one'] }),
            projectEntry({ all: true, application_roles: ['two'] }),
          ],
        },
      })
    ).toEqual(['one', 'two']);
  });

  it('ignores project entries for other projects and other project types', () => {
    expect(
      readApplicationRoles(context, {
        project: {
          security: [
            projectEntry({ all: false, project_ids: ['other-project'], application_roles: ['x'] }),
            projectEntry({ all: false, application_roles: ['y'] }),
          ],
          observability: [projectEntry({ all: true, application_roles: ['z'] })],
        },
      })
    ).toEqual([]);
  });

  it('drops a role granted by more than one entry, keeping its first position', () => {
    expect(
      readApplicationRoles(context, {
        organization: [
          {
            role_id: 'organization-application-only',
            organization_id: 'organization-id',
            application_roles: ['viewer', 'editor'],
          },
        ],
        project: {
          security: [projectEntry({ all: true, application_roles: ['editor', 'analyst'] })],
        },
      })
    ).toEqual(['viewer', 'editor', 'analyst']);
  });

  // Accounts created before Kibana sent application roles carry entries without them.
  it('reports no roles for entries that carry no application roles', () => {
    expect(
      readApplicationRoles(context, {
        organization: [{ role_id: 'organization-admin', organization_id: 'organization-id' }],
      })
    ).toEqual([]);
    expect(readApplicationRoles(context, {})).toEqual([]);
  });
});
