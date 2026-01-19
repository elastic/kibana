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
