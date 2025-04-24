/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSETS_SAVED_OBJECT_TYPE } from '../../../../../constants';
import type { AssetsMap, KibanaAssetType, PackageAssetReference } from '../../../../../types';

import { removeArchiveEntries, saveArchiveEntriesFromAssetsMap } from '../../../archive/storage';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';
import { getPathParts } from '../../../archive';

export async function stepSaveArchiveEntries(context: InstallContext) {
  const { packageInstallContext, savedObjectsClient, installSource, useStreaming } = context;

  const { packageInfo, archiveIterator } = packageInstallContext;

  let assetsToSaveMap: AssetsMap = new Map();

  let packageAssetRefs: PackageAssetReference[] = [];

  async function flushAssets() {
    const paths = Array.from(assetsToSaveMap.keys());
    const packageAssetResults = await withPackageSpan('Update archive entries', () =>
      saveArchiveEntriesFromAssetsMap({
        savedObjectsClient,
        assetsMap: assetsToSaveMap,
        paths,
        packageInfo,
        installSource,
      })
    );
    packageAssetRefs = [
      ...packageAssetRefs,
      ...packageAssetResults.saved_objects.map((result) => ({
        id: result.id,
        path: result.attributes?.asset_path,
        type: ASSETS_SAVED_OBJECT_TYPE as typeof ASSETS_SAVED_OBJECT_TYPE,
      })),
    ];

    assetsToSaveMap = new Map();
  }

  await archiveIterator.traverseEntries(async (entry) => {
    const assetType = getPathParts(entry.path).type as KibanaAssetType;
    if (assetType === 'security_rule' && useStreaming) {
      // Skip security rules to avoid storing to many things
    } else {
      assetsToSaveMap.set(entry.path, entry.buffer);
    }
    if (assetsToSaveMap.size > 100) {
      await flushAssets();
    }
  });

  await flushAssets();

  return { packageAssetRefs };
}

export async function cleanupArchiveEntriesStep(context: InstallContext) {
  const { logger, savedObjectsClient, installedPkg, retryFromLastState, force, initialState } =
    context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.SAVE_ARCHIVE_ENTRIES &&
    installedPkg?.attributes?.package_assets &&
    installedPkg.attributes.package_assets.length > 0
  ) {
    const { package_assets: packageAssets } = installedPkg.attributes;

    logger.debug('Retry transition - clean up package archive assets');
    await withPackageSpan('Retry transition - clean up package archive assets', async () => {
      await removeArchiveEntries({ savedObjectsClient, refs: packageAssets });
    });
  }
}
