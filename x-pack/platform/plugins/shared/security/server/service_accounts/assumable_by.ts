/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountAssumableBy, UiamOAuthProjectType } from '@kbn/core-security-server';

export interface BuildAssumableByParams {
  organizationId: string;
  projectId: string;
  projectType: UiamOAuthProjectType;
}

/**
 * Builds the set of principals allowed to exchange a service account's credentials
 * for an access token, scoping it to the current Kibana project.
 */
export const buildAssumableBy = ({
  organizationId,
  projectId,
  projectType,
}: BuildAssumableByParams): ServiceAccountAssumableBy[] => [
  {
    type: 'project-service-account',
    organization_id: organizationId,
    project_type: projectType,
    project_id: projectId,
  },
];
