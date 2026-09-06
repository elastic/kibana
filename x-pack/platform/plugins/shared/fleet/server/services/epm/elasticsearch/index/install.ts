/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import type { EsAssetReference } from '../../../../types';
import { ElasticsearchAssetType } from '../../../../types';
import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import { retryTransientEsErrors } from '../retry';
import type { AssetsMap, PackageInstallContext } from '../../../../../common/types';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES } from '../../../../constants';

/**
 * Returns true when an index pattern names a single concrete index (no wildcards).
 * Packages that ship fixed-name indices (e.g. github-intel-teams) use concrete patterns;
 * data-stream style patterns like logs-*-default are skipped.
 */
export const isConcreteIndexPattern = (pattern: string): boolean => {
  return pattern.length > 0 && !pattern.includes('*') && !pattern.includes('?');
};

const isIndexTemplatePath = (path: string): boolean => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.indexTemplate;
};

/**
 * Collect concrete index names from package-shipped index templates.
 */
export const getConcreteIndexNamesFromTemplates = async (
  packageInstallContext: PackageInstallContext
): Promise<string[]> => {
  const templatePaths = packageInstallContext.paths.filter((path) => isIndexTemplatePath(path));
  if (templatePaths.length === 0) {
    return [];
  }

  const templateAssetsMap: AssetsMap = new Map();
  await packageInstallContext.archiveIterator.traverseEntries(
    async (entry) => {
      if (!entry.buffer) {
        return;
      }
      templateAssetsMap.set(entry.path, entry.buffer);
    },
    (path) => templatePaths.includes(path)
  );

  const indexNames = new Set<string>();
  for (const path of templatePaths) {
    const content = JSON.parse(getAssetFromAssetsMap(templateAssetsMap, path).toString('utf8')) as {
      index_patterns?: string[];
    };
    for (const pattern of content.index_patterns ?? []) {
      if (isConcreteIndexPattern(pattern)) {
        indexNames.add(pattern);
      }
    }
  }

  return [...indexNames].sort();
};

/**
 * Create empty indices for concrete index_patterns declared on package index templates.
 * Idempotent: existing indices are left untouched. Indices are tracked as installed_es
 * refs of type `index` so they appear in package asset lists; Fleet uninstall does not
 * delete them (user data preservation).
 */
export async function installConcreteIndicesFromTemplates(
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[]
): Promise<EsAssetReference[]> {
  const { packageInfo } = packageInstallContext;
  const indexNames = await getConcreteIndexNamesFromTemplates(packageInstallContext);
  if (indexNames.length === 0) {
    return esReferences;
  }

  logger.debug(
    `Creating ${indexNames.length} concrete indices from package templates for ${packageInfo.name}`
  );

  const createdOrExisting: string[] = [];

  await pMap(
    indexNames,
    async (indexName) => {
      try {
        await retryTransientEsErrors(
          () =>
            esClient.indices.create(
              { index: indexName },
              {
                // 400: resource_already_exists_exception when the index is already present
                ignore: [400],
              }
            ),
          { logger }
        );
        createdOrExisting.push(indexName);
      } catch (err) {
        // Do not fail package install if a single index cannot be created; workflows that
        // write first can still recover, and reads should use ignore_unavailable.
        logger.warn(
          `Could not create index ${indexName} for package ${packageInfo.name}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  if (createdOrExisting.length === 0) {
    return esReferences;
  }

  return updateEsAssetReferences(savedObjectsClient, packageInfo.name, esReferences, {
    assetsToAdd: createdOrExisting.map((id) => ({
      type: ElasticsearchAssetType.index,
      id,
    })),
  });
}
