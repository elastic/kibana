/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Registry from '../registry';
import { cacheHas } from '../registry/cache';
import { RegistryPackage } from '../../common/types';

export function getAssets(
  packageInfo: RegistryPackage,
  filter = (path: string): boolean => true,
  dataSet: string = ''
): string[] {
  const assets: string[] = [];

  // Skip directories
  for (const path of packageInfo.assets) {
    if (path.endsWith('/')) {
      continue;
    }

    // Check if a dataSet is set, and if yes, filter for all assets in it
    if (dataSet !== '') {
      // TODO: Filter for dataset path
      const comparePath =
        '/package/' + packageInfo.name + '-' + packageInfo.version + '/dataset/' + dataSet;
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
  dataSet: string = ''
): Promise<Registry.ArchiveEntry[]> {
  // TODO: Needs to be called to fill the cache but should not be required
  const pkgkey = packageInfo.name + '-' + packageInfo.version;
  if (!cacheHas(pkgkey)) await Registry.getArchiveInfo(pkgkey);

  // Gather all asset data
  const assets = getAssets(packageInfo, filter, dataSet);

  const entries: Registry.ArchiveEntry[] = [];

  for (const asset of assets) {
    const subPath = asset.substring(9);
    const buf = Registry.getAsset(subPath);

    const entry: Registry.ArchiveEntry = {
      path: asset,
      buffer: buf,
    };
    entries.push(entry);
  }

  return entries;
}
