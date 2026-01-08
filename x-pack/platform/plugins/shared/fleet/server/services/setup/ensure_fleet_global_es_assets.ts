/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import pMap from 'p-map';

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { ensureDefaultComponentTemplates } from '../epm/elasticsearch/template/install';
import {
  ensureFleetEventIngestedPipelineIsInstalled,
  ensureFleetFinalPipelineIsInstalled,
} from '../epm/elasticsearch/ingest_pipeline/install';
import { getInstallations, reinstallPackageForInstallation } from '../epm/packages';

import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../../constants';

import type { Installation } from '../../types';

import { appContextService } from '../app_context';

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
  const config = appContextService.getConfig();
  const skipGlobalAssetPackageReinstall =
    config?.startupOptimization?.skipGlobalAssetPackageReinstall ?? false;
  const maxConcurrency =
    config?.startupOptimization?.maxConcurrentPackageOperations ??
    MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS;

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
      if (skipGlobalAssetPackageReinstall) {
        logger.info(
          `Skipping package reinstallation after global asset changes (skipGlobalAssetPackageReinstall=true). ` +
            `${createdAssets.length} assets were created: ${createdAssets
              .map((a) => a.name)
              .join(', ')}`
        );
        return;
      }

      logger.info(
        `Global Fleet assets changed (${createdAssets.length} created). ` +
          `Checking which packages need reinstallation...`
      );

      // Get all installed packages
      const installedPackages = await getInstallations(soClient);
      const installations = installedPackages.saved_objects.map((so) => so.attributes);

      // Filter packages that actually need reinstallation based on the changed assets
      const packagesToReinstall = filterPackagesNeedingReinstall(
        installations,
        createdAssets,
        logger
      );

      if (packagesToReinstall.length === 0) {
        logger.debug('No packages require reinstallation after global asset changes');
        return;
      }

      logger.info(`Reinstalling ${packagesToReinstall.length} packages after global asset changes`);

      await pMap(
        packagesToReinstall,
        async (installation) => {
          await reinstallPackageForInstallation({
            soClient,
            esClient,
            installation,
          }).catch((err) => {
            apm.captureError(err);
            logger.error(
              `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets: ${err.message}`
            );
          });
        },
        { concurrency: maxConcurrency }
      );
    }
  }
}

/**
 * Filter packages that actually need reinstallation based on changed global assets.
 *
 * For example:
 * - If only ingest pipelines changed, packages without data streams may not need reinstall
 * - If component templates changed, only packages using those templates need reinstall
 */
function filterPackagesNeedingReinstall(
  installedPackages: Installation[],
  createdAssets: GlobalAssetResult[],
  logger: Logger
): Installation[] {
  const componentTemplatesCreated = createdAssets.some(
    (a) =>
      a.name.includes('component_template') ||
      a.name.includes('.fleet_globals') ||
      a.name.includes('.fleet_agent_id_verification')
  );

  const pipelinesCreated = createdAssets.some(
    (a) =>
      a.name.includes('pipeline') ||
      a.name.includes('.fleet_final_pipeline') ||
      a.name.includes('.fleet-event-ingest')
  );

  return installedPackages.filter((pkg) => {
    // If package has no ES assets, it doesn't need reinstall
    if (!pkg.installed_es || pkg.installed_es.length === 0) {
      logger.debug(`Skipping ${pkg.name}: no ES assets installed`);
      return false;
    }

    const hasIndexTemplates = pkg.installed_es.some((asset) => asset.type === 'index_template');

    const hasIngestPipelines = pkg.installed_es.some((asset) => asset.type === 'ingest_pipeline');

    if (componentTemplatesCreated && hasIndexTemplates) {
      logger.debug(
        `Including ${pkg.name}: has index templates affected by component template changes`
      );
      return true;
    }

    if (pipelinesCreated && !componentTemplatesCreated && hasIngestPipelines) {
      logger.debug(`Including ${pkg.name}: has pipelines affected by pipeline changes`);
      return true;
    }

    logger.debug(`Skipping ${pkg.name}: not affected by global asset changes`);
    return false;
  });
}
