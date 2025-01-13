/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap } from 'rxjs';
import type { CloudSetup as CloudSetupBrowser } from '@kbn/cloud-plugin/public';
import type { CloudSetup as CloudSetupServer } from '@kbn/cloud-plugin/server';
import type { PluginInitializerContext as PluginInitializerContextBrowser } from '@kbn/core-plugins-browser';
import type { PluginInitializerContext as PluginInitializerContextServer } from '@kbn/core-plugins-server';
import type { FeatureFlagsSetup as FeatureFlagsSetupBrowser } from '@kbn/core-feature-flags-browser';
import type { FeatureFlagsSetup as FeatureFlagsSetupServer } from '@kbn/core-feature-flags-server';
import type { Logger } from '@kbn/logging';
import type { MetadataService } from './metadata_service';

/**
 * @private
 */
export function initializeMetadata({
  metadataService,
  initializerContext,
  featureFlags,
  cloud,
  logger,
}: {
  metadataService: MetadataService;
  initializerContext: PluginInitializerContextBrowser | PluginInitializerContextServer;
  featureFlags: FeatureFlagsSetupBrowser | FeatureFlagsSetupServer;
  cloud: CloudSetupBrowser | CloudSetupServer;
  logger: Logger;
}) {
  const offering = initializerContext.env.packageInfo.buildFlavor;

  metadataService.setup({
    instanceKey: cloud.serverless?.projectId || cloud.deploymentId,
    offering,
    version: initializerContext.env.packageInfo.version,
    build_num: initializerContext.env.packageInfo.buildNum,
    build_sha: initializerContext.env.packageInfo.buildSha,
    build_sha_short: initializerContext.env.packageInfo.buildShaShort,
    project_type: cloud.serverless.projectType,
    orchestrator_target: cloud.serverless.orchestratorTarget,
    organizationKey: cloud.organizationId,
    trial_end_date: cloud.trialEndDate,
    is_elastic_staff: cloud.isElasticStaffOwned,
  });

  // Update the client's contexts when we get any updates in the metadata.
  metadataService.userMetadata$
    .pipe(
      // Using concatMap to ensure we call the promised update in an orderly manner to avoid concurrency issues
      concatMap(async (userMetadata) => {
        try {
          await featureFlags.appendContext(userMetadata);
        } catch (err) {
          logger.warn(`Failed to set the feature flags context ${err}`);
        }
      })
    )
    .subscribe(); // This subscription will stop when the metadataService stops because it completes the Observable
}
