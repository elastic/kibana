/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { parse } from 'yaml';

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { PackageInvalidArchiveError } from '../../../../errors';
import type {
  AssetsMap,
  EsAssetReference,
  PackageInstallContext,
} from '../../../../../common/types';
import { ElasticsearchAssetType } from '../../../../../common/types';
import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import { retryTransientEsErrors } from '../retry';
import { MAX_CONCURRENT_INDEX_ALIAS_OPERATIONS } from '../../../../constants';

export interface IndexAlias {
  alias: string;
  indices: string[];
}

export async function installIndexAliases({
  packageInstallContext,
  esClient,
  savedObjectsClient,
  logger,
  esReferences,
}: {
  packageInstallContext: PackageInstallContext;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  esReferences: EsAssetReference[];
}): Promise<EsAssetReference[]> {
  const { packageInfo } = packageInstallContext;
  const indexAliasPaths = packageInstallContext.paths.filter((path) => isIndexAlias(path));
  if (!indexAliasPaths.length) return esReferences;

  const indexAliasAssetsMap: AssetsMap = new Map();
  await packageInstallContext.archiveIterator.traverseEntries(
    async (entry) => {
      if (!entry.buffer) {
        return;
      }

      indexAliasAssetsMap.set(entry.path, entry.buffer);
    },
    (path) => indexAliasPaths.includes(path)
  );

  const indexAliases: IndexAlias[] = indexAliasPaths.map((path) => {
    const assetData = getAssetFromAssetsMap(indexAliasAssetsMap, path).toString('utf-8');
    const data = path.endsWith('.yml') ? parse(assetData) : JSON.parse(assetData);

    return { alias: data.alias, indices: data.indices };
  });

  esReferences = await updateEsAssetReferences(savedObjectsClient, packageInfo.name, esReferences, {
    assetsToAdd: indexAliases.map((indexAlias) => ({
      type: ElasticsearchAssetType.indexAlias,
      id: indexAlias.alias,
    })),
  });

  await pMap(
    indexAliases,
    async (indexAlias) => {
      try {
        await retryTransientEsErrors(
          () =>
            Promise.all(
              indexAlias.indices.map((index) =>
                esClient.indices.putAlias({ index, name: indexAlias.alias })
              )
            ),
          { logger }
        );
      } catch (err) {
        throw new PackageInvalidArchiveError(
          `Couldn't install index alias ${indexAlias.alias}: ${err.message}`
        );
      }
    },
    {
      concurrency: MAX_CONCURRENT_INDEX_ALIAS_OPERATIONS,
    }
  );

  return esReferences;
}

const isIndexAlias = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.indexAlias;
};
