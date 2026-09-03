/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamOAuthProjectType } from '@kbn/core-security-server';

import { buildAssumableBy } from './assumable_by';

describe('buildAssumableBy', () => {
  it('scopes the service account to the current project', () => {
    expect(
      buildAssumableBy({
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'security',
      })
    ).toEqual([
      {
        type: 'project-service-account',
        organization_id: 'organization-id',
        project_type: 'security',
        project_id: 'project-id',
      },
    ]);
  });

  it.each<UiamOAuthProjectType>(['elasticsearch', 'observability', 'security', 'vectordb'])(
    'passes through the `%s` project type verbatim',
    (projectType) => {
      const [entry] = buildAssumableBy({
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType,
      });

      expect(entry.type).toBe('project-service-account');
      if (entry.type !== 'project-service-account') return;
      expect(entry.project_type).toBe(projectType);
    }
  );
});
