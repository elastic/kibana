/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';

import type { Installation, PackageInstallContext } from '../../../../../common/types';
import {
  KibanaSavedObjectType,
  type KibanaAssetReference,
  type KibanaAssetType,
  type PackageSpecTags,
} from '../../../../types';
import { getPathParts } from '../../archive';
import { appContextService } from '../../../app_context';

import { saveKibanaAssetsRefs } from '../../packages/install';
import { isOutdatedKibanaVersion } from '../../packages/kibana_version_check';

import { indexPatternTypes } from '../index_pattern/install';

import type { ArchiveAsset } from './install';
import {
  KibanaSavedObjectTypeMapping,
  createSavedObjectKibanaAsset,
  installManagedIndexPattern,
  isKibanaAssetType,
  toAssetReference,
} from './install';
import { getSpaceAwareSaveobjectsClients } from './saved_objects';

interface InstallKibanaAssetsWithStreamingArgs {
  pkgName: string;
  packageInstallContext: PackageInstallContext;
  spaceId: string;
  assetTags?: PackageSpecTags[];
  savedObjectsClient: SavedObjectsClientContract;
  installedPkg?: SavedObject<Installation>;
}

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 100;

export async function installKibanaAssetsWithStreaming({
  spaceId,
  packageInstallContext,
  savedObjectsClient,
  pkgName,
  installedPkg,
}: InstallKibanaAssetsWithStreamingArgs): Promise<KibanaAssetReference[]> {
  const { archiveIterator } = packageInstallContext;

  const { savedObjectClientWithSpace, savedObjectsImporter } =
    getSpaceAwareSaveobjectsClients(spaceId);

  await installManagedIndexPattern({
    savedObjectsImporter,
    savedObjectsClient,
  });

  // Existing assets are normally left untouched (huge perf win on repeat installs of the
  // ~20k-asset security_detection_engine package, see #195888). See isOutdatedKibanaVersion for
  // why we force an overwrite once per Kibana major.minor bump.
  const overwriteExistingAssets = isOutdatedKibanaVersion(
    installedPkg?.attributes.installed_kibana_version,
    appContextService.getKibanaVersion()
  );

  const assetRefs: KibanaAssetReference[] = [];
  let batch: ArchiveAsset[] = [];

  await archiveIterator.traverseEntries(async ({ path, buffer }) => {
    if (!buffer || !isKibanaAssetType(path)) {
      return;
    }
    const savedObject = JSON.parse(buffer.toString('utf8')) as ArchiveAsset;
    const assetType = getPathParts(path).type as KibanaAssetType;
    const soType = KibanaSavedObjectTypeMapping[assetType];
    if (savedObject.type !== soType) {
      return;
    }

    if (
      soType === KibanaSavedObjectType.alertingRuleTemplate &&
      !appContextService.getExperimentalFeatures().enableAgentStatusAlerting
    ) {
      return;
    }

    if (
      soType === KibanaSavedObjectType.sloTemplate &&
      !appContextService.getExperimentalFeatures().enableSloTemplates
    ) {
      return;
    }

    if (
      soType === KibanaSavedObjectType.indexPattern &&
      indexPatternTypes.some((pattern) => `${pattern}-*` === savedObject.id)
    ) {
      return;
    }

    batch.push(savedObject);
    assetRefs.push(toAssetReference(savedObject));

    if (batch.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await bulkCreateSavedObjects({
        savedObjectsClient: savedObjectClientWithSpace,
        kibanaAssets: batch,
        refresh: false,
        overwrite: overwriteExistingAssets,
      });
      batch = [];
    }
  });

  // install any remaining assets
  if (batch.length) {
    await bulkCreateSavedObjects({
      savedObjectsClient: savedObjectClientWithSpace,
      kibanaAssets: batch,
      // Use wait_for with the last batch to ensure all assets are readable once the install is complete
      refresh: 'wait_for',
      overwrite: overwriteExistingAssets,
    });
  }

  // Update the installation saved object with installed kibana assets
  await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs, spaceId);

  return assetRefs;
}

async function bulkCreateSavedObjects({
  savedObjectsClient,
  kibanaAssets,
  refresh,
  overwrite,
}: {
  kibanaAssets: ArchiveAsset[];
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: boolean | 'wait_for';
  overwrite: boolean;
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset));

  const { saved_objects: createdSavedObjects } = await savedObjectsClient.bulkCreate(
    toBeSavedObjects,
    {
      // Skip existing assets by default (huge perf win on repeat installs); overwrite is forced
      // once per Kibana version bump, see the comment in installKibanaAssetsWithStreaming.
      overwrite,
      managed: true,
      refresh,
    }
  );

  return createdSavedObjects;
}
