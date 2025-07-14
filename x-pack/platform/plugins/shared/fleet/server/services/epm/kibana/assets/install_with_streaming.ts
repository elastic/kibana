/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';

import { MAX_CONCURRENT_PACKAGE_ASSETS } from '../../../../constants';
import type { PackageInstallContext } from '../../../../../common/types';
import { type KibanaAssetReference, KibanaAssetType } from '../../../../types';
import { getPathParts } from '../../archive';

import { saveKibanaAssetsRefs } from '../../packages/install';

import type { ArchiveAsset, SavedObjectAsset } from './install';
import {
  KibanaSavedObjectTypeMapping,
  createSavedObjectKibanaAsset,
  installManagedIndexPattern,
  isKibanaAssetType,
  toAssetReference,
} from './install';
import { getSpaceAwareSaveobjectsClients } from './saved_objects';
import { installAlertRules, type AlertRuleAsset } from './alert_rules';

interface InstallKibanaAssetsWithStreamingArgs {
  logger: Logger;
  pkgName: string;
  packageInstallContext: PackageInstallContext;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  alertingRulesClient: RulesClientApi;
}

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 100;

export async function installKibanaAssetsWithStreaming({
  logger,
  spaceId,
  packageInstallContext,
  alertingRulesClient,
  savedObjectsClient,
  pkgName,
}: InstallKibanaAssetsWithStreamingArgs): Promise<KibanaAssetReference[]> {
  const { archiveIterator } = packageInstallContext;

  const { savedObjectClientWithSpace, savedObjectsImporter } =
    getSpaceAwareSaveobjectsClients(spaceId);

  await installManagedIndexPattern({
    savedObjectsImporter,
    savedObjectsClient,
  });

  const assetTags = packageInstallContext.packageInfo?.asset_tags;
  const assetRefs: KibanaAssetReference[] = [];
  let savedObjectBatch: SavedObjectAsset[] = [];
  let alertRuleBatch: AlertRuleAsset[] = [];

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

    if (assetType === KibanaAssetType.alert) {
      alertRuleBatch.push(savedObject as AlertRuleAsset);
    } else {
      savedObjectBatch.push(savedObject as SavedObjectAsset);
    }

    assetRefs.push(toAssetReference(savedObject));

    if (savedObjectBatch.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await bulkCreateSavedObjects({
        savedObjectsClient: savedObjectClientWithSpace,
        kibanaAssets: savedObjectBatch,
        refresh: false,
      });
      savedObjectBatch = [];
    }
  });

  if (alertRuleBatch.length >= MAX_CONCURRENT_PACKAGE_ASSETS) {
    await installAlertRules({
      logger,
      alertingRulesClient,
      alertRuleAssets: alertRuleBatch,
      assetsChunkSize: MAX_CONCURRENT_PACKAGE_ASSETS,
      context: { pkgName, spaceId, assetTags },
    });
    alertRuleBatch = [];
  }

  // install any remaining assets
  if (savedObjectBatch.length) {
    await bulkCreateSavedObjects({
      savedObjectsClient: savedObjectClientWithSpace,
      kibanaAssets: savedObjectBatch,
      // Use wait_for with the last batch to ensure all assets are readable once the install is complete
      refresh: 'wait_for',
    });
  }

  if (alertRuleBatch.length) {
    await installAlertRules({
      logger,
      alertingRulesClient,
      alertRuleAssets: alertRuleBatch,
      assetsChunkSize: MAX_CONCURRENT_PACKAGE_ASSETS,
      context: { pkgName, spaceId, assetTags },
    });
  }

  // Update the installation saved object with installed kibana assets
  await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs);

  return assetRefs;
}

async function bulkCreateSavedObjects({
  savedObjectsClient,
  kibanaAssets,
  refresh,
}: {
  kibanaAssets: SavedObjectAsset[];
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: boolean | 'wait_for';
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset));

  const { saved_objects: createdSavedObjects } = await savedObjectsClient.bulkCreate(
    toBeSavedObjects,
    {
      // We only want to install new saved objects without overwriting existing ones
      overwrite: false,
      managed: true,
      refresh,
    }
  );

  return createdSavedObjects;
}
