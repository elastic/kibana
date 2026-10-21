/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';
import { ElasticsearchAssetType } from '../../../../types';
import type { EsAssetReference } from '../../../../types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';
import { appContextService } from '../../../app_context';

import { retryTransientEsErrors } from '../retry';
import { MAX_CONCURRENT_TRANSFORMS_OPERATIONS } from '../../../../constants';

export const stopTransforms = async (transformIds: string[], esClient: ElasticsearchClient) => {
  for (const transformId of transformIds) {
    // Without wait_for_completion the indexer keeps draining and can re-create the transform's state doc after deleteTransform removed it.
    await esClient.transform.stopTransform(
      { transform_id: transformId, force: true, wait_for_completion: true },
      { ignore: [404] }
    );
  }
};

export const deleteTransforms = async (
  esClient: ElasticsearchClient,
  transformIds: string[],
  deleteDestinationIndices = false,
  secondaryAuth?: SecondaryAuthorizationHeader
) => {
  const logger = appContextService.getLogger();
  if (transformIds.length) {
    logger.info(`Deleting currently installed transform ids ${transformIds}`);
  }

  await pMap(
    transformIds,
    async (transformId) => {
      await stopTransforms([transformId], esClient);
      await retryTransientEsErrors(() =>
        esClient.transform.deleteTransform(
          {
            force: true,
            transform_id: transformId,
            delete_dest_index: deleteDestinationIndices,
          },
          { ...(secondaryAuth ? secondaryAuth : {}), ignore: [404] }
        )
      );
      logger.info(`Deleted: ${transformId}`);
    },
    {
      concurrency: MAX_CONCURRENT_TRANSFORMS_OPERATIONS,
    }
  );
};

export const deleteTransformRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  installedEsAssets: EsAssetReference[],
  pkgName: string,
  installedEsIdToRemove: string[],
  currentInstalledEsTransformIds: string[]
) => {
  const seen = new Set<string>();
  const filteredAssets = installedEsAssets.filter(({ type, id }) => {
    if (type !== ElasticsearchAssetType.transform) return true;
    const add =
      (currentInstalledEsTransformIds.includes(id) || !installedEsIdToRemove.includes(id)) &&
      !seen.has(id);
    seen.add(id);
    return add;
  });
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: filteredAssets,
  });
};
