/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsClient } from '@elastic/ebt/client';
import { of } from 'rxjs';
import { parseDeploymentIdFromDeploymentUrl } from './parse_deployment_id_from_deployment_url';

export interface CloudDeploymentMetadata {
  id?: string;
  organization_id?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
  deployment_url?: string;
  serverless?: {
    project_id?: string;
    project_type?: string;
    orchestrator_target?: string;
  };
}

export function registerCloudDeploymentMetadataAnalyticsContext(
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  cloudMetadata: CloudDeploymentMetadata
) {
  if (!cloudMetadata.id) {
    return;
  }
  const {
    id: cloudId,
    organization_id: organizationId,
    trial_end_date: cloudTrialEndDate,
    is_elastic_staff_owned: cloudIsElasticStaffOwned,
    serverless: {
      project_id: projectId,
      project_type: projectType,
      orchestrator_target: orchestratorTarget,
    } = {},
  } = cloudMetadata;

  analytics.registerContextProvider({
    name: 'Cloud Deployment Metadata',
    context$: of({
      cloudId,
      organizationId,
      deploymentId: parseDeploymentIdFromDeploymentUrl(cloudMetadata.deployment_url),
      cloudTrialEndDate,
      cloudIsElasticStaffOwned,
      projectId,
      projectType,
      orchestratorTarget,
    }),
    schema: {
      cloudId: {
        type: 'keyword',
        _meta: { description: 'The Cloud ID' },
      },
      organizationId: {
        type: 'keyword',
        _meta: {
          description: 'The Elastic Cloud Organization ID that owns the deployment/project',
          optional: true,
        },
      },
      deploymentId: {
        type: 'keyword',
        _meta: { description: 'The Deployment ID', optional: true },
      },
      cloudTrialEndDate: {
        type: 'date',
        _meta: { description: 'When the Elastic Cloud trial ends/ended', optional: true },
      },
      cloudIsElasticStaffOwned: {
        type: 'boolean',
        _meta: {
          description: '`true` if the owner of the deployment is an Elastician',
          optional: true,
        },
      },
      projectId: {
        type: 'keyword',
        _meta: { description: 'The Serverless Project ID', optional: true },
      },
      projectType: {
        type: 'keyword',
        _meta: { description: 'The Serverless Project type', optional: true },
      },
      orchestratorTarget: {
        type: 'keyword',
        _meta: {
          description: 'The Orchestrator Target where it is deployed (canary/non-canary)',
          optional: true,
        },
      },
    },
  });
}
