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

  if (options?.reinstallPackages !== true) {
    const assetResults = globalAssetsRes.flat();
    if (assetResults.some((asset) => asset.isCreated)) {
      // Update existing index template
      const installedPackages = await getInstallations(soClient);
      await pMap(
        installedPackages.saved_objects,
        async ({ attributes: installation }) => {
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
        { concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS }
      );
    }
  }
}
