/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { ensureDefaultComponentTemplates } from '../epm/elasticsearch/template/install';
import {
  ensureFleetEventIngestedPipelineIsInstalled,
  ensureFleetFinalPipelineIsInstalled,
} from '../epm/elasticsearch/ingest_pipeline/install';

import { appContextService } from '../app_context';
import { scheduleSetupTask } from '../../tasks/setup/schedule';
import { packagePolicyService } from '../package_policy';
import { getPackageInfo } from '../epm/packages';
import {
  getCustomDatasetStreams,
  installAssetsForIntegrationPackagePolicyCustomDatasets,
} from '../epm/packages/input_type_packages';

interface GlobalAssetResult {
  isCreated: boolean;
  name: string;
}

/**
 * Ensure ES assets shared by all Fleet index template are installed
 */
export async function ensureFleetGlobalEsAssets(
  {
    logger,
    soClient,
    esClient,
  }: {
    logger: Logger;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
  },
  options: {
    reinstallPackages?: boolean;
  }
) {
  // Ensure Global Fleet ES assets are installed
  logger.debug('Creating Fleet component template and ingest pipeline');
  const globalAssetsRes = await Promise.all([
    ensureDefaultComponentTemplates(esClient, logger), // returns an array
    ensureFleetFinalPipelineIsInstalled(esClient, logger),
    ensureFleetEventIngestedPipelineIsInstalled(esClient, logger),
  ]);

  if (options?.reinstallPackages) {
    const assetResults = globalAssetsRes.flat() as GlobalAssetResult[];
    const createdAssets = assetResults.filter((asset) => asset.isCreated);

    if (createdAssets.length > 0) {
      logger.info(
        `Global Fleet assets changed (${createdAssets.length} created: ${createdAssets
          .map((a) => a.name)
          .join(', ')}). Scheduling package reinstallation task.`
      );

      const taskManager = appContextService.getTaskManagerStart();
      if (taskManager) {
        await scheduleSetupTask(taskManager, { type: 'reinstallPackagesForGlobalAssetUpdate' });
      } else {
        logger.warn(
          'Task manager not available, skipping deferred package reinstallation. ' +
            'Packages may need to be manually reinstalled.'
        );
      }
    }
  }
}

/**
 * Layer 1 migration: scans all existing integration package policies and installs missing
 * index templates for any that have a custom `data_stream.dataset` override. Idempotent —
 * skips silently if the template already exists and is owned by the same package.
 *
 * Gated behind the `enableCustomDatasetTemplateMigration` experimental feature flag.
 */
export async function ensureCustomDatasetTemplatesForIntegrationPolicies({
  logger,
  soClient,
  esClient,
}: {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}) {
  logger.debug('Checking for integration policies with custom datasets missing index templates');

  const { items: allPolicies } = await packagePolicyService.list(soClient, {
    perPage: 10000,
  });

  const integrationPolicies = allPolicies.filter((p) => p.package?.name && p.package?.version);

  for (const policy of integrationPolicies) {
    if (!policy.package?.name || !policy.package?.version) continue;

    let pkgInfo;
    try {
      pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: policy.package.name,
        pkgVersion: policy.package.version,
      });
    } catch (err) {
      logger.debug(
        `Skipping migration for policy ${policy.id}: could not resolve package info: ${err.message}`
      );
      continue;
    }

    if (pkgInfo.type !== 'integration') continue;

    const customStreams = getCustomDatasetStreams(policy, pkgInfo);
    if (customStreams.length === 0) continue;

    // Pre-validate dataset names before attempting install to avoid noisy errors
    const invalidDatasets = customStreams
      .map((s) => s.customDatasetName)
      .filter((name) => /[^a-z0-9_.]/.test(name));

    if (invalidDatasets.length > 0) {
      logger.warn(
        `Skipping migration for policy ${policy.id} (package: ${policy.package.name}): ` +
          `invalid dataset name(s): ${invalidDatasets.join(', ')}`
      );
      continue;
    }

    try {
      await installAssetsForIntegrationPackagePolicyCustomDatasets({
        pkgInfo,
        packagePolicy: policy,
        esClient,
        soClient,
        logger,
        force: false,
      });
    } catch (err) {
      logger.warn(
        `Migration: failed to install custom dataset templates for policy ${policy.id} ` +
          `(package: ${policy.package.name}): ${err.message}`
      );
    }
  }

  logger.debug('Finished checking integration policies with custom datasets');
}
