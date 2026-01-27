/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { load } from 'js-yaml';

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
import { MAX_CONCURRENT_ESQL_VIEWS_OPERATIONS } from '../../../../constants';

export async function installEsqlViews({
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
  const esqlViewPaths = packageInstallContext.paths.filter((path) => isEsqlViews(path));
  if (!esqlViewPaths.length) return esReferences;

  const esqlViewAssetsMap: AssetsMap = new Map();
  await packageInstallContext.archiveIterator.traverseEntries(
    async (entry) => {
      if (!entry.buffer) {
        return;
      }

      esqlViewAssetsMap.set(entry.path, entry.buffer);
    },
    (path) => esqlViewPaths.includes(path)
  );

  const esqlViews = esqlViewPaths.map((path) => {
    const assetData = getAssetFromAssetsMap(esqlViewAssetsMap, path).toString('utf-8');
    const data = path.endsWith('.yml') ? load(assetData) : JSON.parse(assetData);

    return { name: data.name, query: data.query };
  });

  esReferences = await updateEsAssetReferences(savedObjectsClient, packageInfo.name, esReferences, {
    assetsToAdd: esqlViews.map((esqlView) => ({
      type: ElasticsearchAssetType.esqlView,
      id: esqlView.name,
    })),
  });

  await pMap(
    esqlViews,
    async (esqlView) => {
      try {
        await retryTransientEsErrors(
          () =>
            esClient.transport.request({
              method: 'PUT',
              path: '/_query/view/' + esqlView.name,
              body: { query: esqlView.query },
            }),
          { logger }
        );
      } catch (err) {
        throw new PackageInvalidArchiveError(`Couldn't install esql views: ${err.message}`);
      }
    },
    {
      concurrency: MAX_CONCURRENT_ESQL_VIEWS_OPERATIONS,
    }
  );

  return esReferences;
}

const isEsqlViews = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.esqlView;
};
