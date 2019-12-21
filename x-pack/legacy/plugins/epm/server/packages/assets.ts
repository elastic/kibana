/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegistryPackage } from '../../common/types';
import * as Registry from '../registry';
import { cacheHas } from '../registry/cache';

// paths from RegistryPackage are routes to the assets on EPR
// paths for ArchiveEntry are routes to the assets in the archive
// RegistryPackage paths have a `/package/` prefix compared to ArchiveEntry paths
const EPR_PATH_PREFIX = '/package/';

export function getAssets(
  packageInfo: RegistryPackage,
  filter = (path: string): boolean => true,
  datasetName?: string
): string[] {
  const assets: string[] = [];
  if (!packageInfo?.assets) return assets;

  // Skip directories
  for (const path of packageInfo.assets) {
    if (path.endsWith('/')) {
      continue;
    }

    // if dataset, filter for them
    if (datasetName) {
      // TODO: Filter for dataset path
      const comparePath =
        EPR_PATH_PREFIX + packageInfo.name + '-' + packageInfo.version + '/dataset/' + datasetName;
      if (!path.includes(comparePath)) {
        continue;
      }
    }
    if (!filter(path)) {
      continue;
    }

    assets.push(path);
  }
  return assets;
}

export async function getAssetsData(
  packageInfo: RegistryPackage,
  filter = (path: string): boolean => true,
  datasetName?: string
): Promise<Registry.ArchiveEntry[]> {
  // TODO: Needs to be called to fill the cache but should not be required
  const pkgkey = packageInfo.name + '-' + packageInfo.version;
  if (!cacheHas(pkgkey)) await Registry.getArchiveInfo(pkgkey);

  // Gather all asset data
  const assets = getAssets(packageInfo, filter, datasetName);
  const entries: Registry.ArchiveEntry[] = assets.map(path => {
    const archivePath = path.replace(EPR_PATH_PREFIX, '');
    const buffer = Registry.getAsset(archivePath);

    return { path, buffer };
  });

  return entries;
}
