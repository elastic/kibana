/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export interface CloudUsageCollectorConfig {
  isCloudEnabled: boolean;
  trialEndDate: string | undefined;
  isElasticStaffOwned: boolean | undefined;
  organizationId: string | undefined;
  deploymentId: string | undefined;
  projectId: string | undefined;
  projectType: string | undefined;
  productTier: string | undefined;
  orchestratorTarget: string | undefined;
  organizationInTrial: boolean | undefined;
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
  productTier?: string;
  orchestratorTarget?: string;
}
export declare function createCloudUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: CloudUsageCollectorConfig
): import('@kbn/usage-collection-plugin/server').Collector<CloudUsage, {}>;
export declare function registerCloudUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  config: CloudUsageCollectorConfig
): void;
export {};
