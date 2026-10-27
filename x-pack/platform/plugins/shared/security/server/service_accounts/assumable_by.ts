/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamProjectType } from '@kbn/core-security-server';

import type { ServiceAccountAssumableBy } from '../uiam';

export interface BuildAssumableByParams {
  organizationId: string;
  projectId: string;
  projectType: UiamProjectType;
  /** Ids of platform service accounts that may assume the account as well as the project. */
  platformServiceAccountIds?: readonly string[];
}

/**
 * Builds the set of principals allowed to exchange a service account's credentials for an access
 * token. The current Kibana project always comes first, so this Kibana can still read, exchange,
 * and revoke the account. Any platform service accounts follow it.
 */
export const buildAssumableBy = ({
  organizationId,
  projectId,
  projectType,
  platformServiceAccountIds = [],
}: BuildAssumableByParams): ServiceAccountAssumableBy[] => [
  {
    type: 'project-service-account',
    organization_id: organizationId,
    project_type: projectType,
    project_id: projectId,
  },
  ...platformServiceAccountIds.map((serviceAccountId): ServiceAccountAssumableBy => ({
    type: 'platform-service-account',
    service_account_id: serviceAccountId,
  })),
];
