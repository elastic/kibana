/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

export interface CloudUsageCollectorConfig {
  isCloudEnabled: boolean;
  // Using * | undefined instead of ?: to force the calling code to list all the options (even when they can be undefined)
  trialEndDate: string | undefined;
  isElasticStaffOwned: boolean | undefined;
  organizationId: string | undefined;
  deploymentId: string | undefined;
  projectId: string | undefined;
  projectType: string | undefined;
  orchestratorTarget: string | undefined;
}

interface CloudUsage {
  isCloudEnabled: boolean;
  trialEndDate?: string;
  inTrial?: boolean;
  isElasticStaffOwned?: boolean;
  organizationId?: string;
  deploymentId?: string;
  projectId?: string;
  projectType?: string;
  orchestratorTarget?: string;
}

export function createCloudUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: CloudUsageCollectorConfig
) {
  const {
    isCloudEnabled,
    trialEndDate,
    isElasticStaffOwned,
    organizationId,
    deploymentId,
    projectId,
    projectType,
    orchestratorTarget,
  } = config;
  const trialEndDateMs = trialEndDate ? new Date(trialEndDate).getTime() : undefined;
  return usageCollection.makeUsageCollector<CloudUsage>({
    type: 'cloud',
    isReady: () => true,
    schema: {
      isCloudEnabled: {
        type: 'boolean',
        _meta: { description: 'Is the deployment running in Elastic Cloud (ESS or Serverless)?' },
      },
      trialEndDate: { type: 'date', _meta: { description: 'End of the trial period' } },
      inTrial: {
        type: 'boolean',
        _meta: { description: 'Is the organization during the trial period?' },
      },
      isElasticStaffOwned: {
        type: 'boolean',
        _meta: { description: 'Is the deploymend owned by an Elastician' },
      },
      organizationId: {
        type: 'keyword',
        _meta: {
          description: 'The Elastic Cloud Organization ID that owns the deployment/project',
        },
      },
      deploymentId: {
        type: 'keyword',
        _meta: { description: 'The ESS Deployment ID' },
      },
      projectId: {
        type: 'keyword',
        _meta: { description: 'The Serverless Project ID' },
      },
      projectType: {
        type: 'keyword',
        _meta: { description: 'The Serverless Project type' },
      },
      orchestratorTarget: {
        type: 'keyword',
        _meta: { description: 'The Orchestrator Target where it is deployed (canary/non-canary)' },
      },
    },
    fetch: () => {
      return {
        isCloudEnabled,
        isElasticStaffOwned,
        organizationId,
        trialEndDate,
        ...(trialEndDateMs ? { inTrial: Date.now() <= trialEndDateMs } : {}),
        deploymentId,
        projectId,
        projectType,
        orchestratorTarget,
      };
    },
  });
}

export function registerCloudUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  config: CloudUsageCollectorConfig
) {
  if (!usageCollection) {
    return;
  }

  const collector = createCloudUsageCollector(usageCollection, config);
  usageCollection.registerCollector(collector);
}
