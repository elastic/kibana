/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installKibanaAssetsAndReferencesMultispace } from '../../../kibana/assets/install';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import { deleteKibanaAssets } from '../../remove';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { INSTALL_STATES, KibanaSavedObjectType } from '../../../../../../common/types';
import { installKibanaAssetsWithStreaming } from '../../../kibana/assets/install_with_streaming';

export async function stepInstallKibanaAssets(context: InstallContext) {
  const { savedObjectsClient, logger, installedPkg, packageInstallContext, spaceId } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, title: pkgTitle } = packageInfo;

  const kibanaAssetPromise = withPackageSpan('Install Kibana assets', () =>
    installKibanaAssetsAndReferencesMultispace({
      savedObjectsClient,
      pkgName,
      pkgTitle,
      packageInstallContext,
      installedPkg,
      logger,
      spaceId,
      assetTags: packageInfo?.asset_tags,
    })
  );
  // Necessary to avoid async promise rejection warning
  // See https://stackoverflow.com/questions/40920179/should-i-refrain-from-handling-promise-rejection-asynchronously
  kibanaAssetPromise.catch(() => {});

  return { kibanaAssetPromise };
}

export async function stepInstallKibanaAssetsWithStreaming(context: InstallContext) {
  const { savedObjectsClient, packageInstallContext, spaceId } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;

  const installedKibanaAssetsRefs = await withPackageSpan(
    'Install Kibana assets with streaming',
    () =>
      installKibanaAssetsWithStreaming({
        savedObjectsClient,
        pkgName,
        packageInstallContext,
        spaceId,
      })
  );

  return { installedKibanaAssetsRefs };
}

export async function cleanUpKibanaAssetsStep(context: InstallContext) {
  const {
    logger,
    installedPkg,
    packageInstallContext,
    spaceId,
    retryFromLastState,
    force,
    initialState,
  } = context;
  const { packageInfo } = packageInstallContext;

  // In case of retry clean up previous installed kibana assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_KIBANA_ASSETS &&
    installedPkg?.attributes?.installed_kibana &&
    installedPkg.attributes.installed_kibana.length > 0
  ) {
    let { installed_kibana: installedObjects } = installedPkg.attributes;
    logger.debug('Retry transition - clean up Kibana assets first');

    // Do not delete created alerting rules or alerting rule templates
    installedObjects = (installedObjects ?? []).filter(
      (asset) =>
        asset.type !== KibanaSavedObjectType.alert &&
        asset.type !== KibanaSavedObjectType.alertingRuleTemplate
    );

    await deleteKibanaAssets({
      installedObjects,
      spaceId,
      packageSpecConditions: packageInfo?.conditions,
      logger,
    });
  }
}

/**
 * Cleans up Kibana assets that are no longer in the package. As opposite to
 * `cleanUpKibanaAssetsStep`, this one is used after the package assets are
 * installed.
 *
 * This function compares the currently installed Kibana assets with the assets
 * in the previous package and removes any assets that are no longer present in the
 * new installation.
 *
 */
export async function cleanUpUnusedKibanaAssetsStep(context: InstallContext) {
  const { logger, installedPkg, packageInstallContext, spaceId, installedKibanaAssetsRefs } =
    context;
  const { packageInfo } = packageInstallContext;

  if (!installedKibanaAssetsRefs) {
    return;
  }

  logger.debug('Clean up Kibana assets that are no longer in the package');

  // Get the assets installed by the previous package
  const previousAssetRefs = installedPkg?.attributes.installed_kibana ?? [];

  // Remove any assets that are not in the new package
  const nextAssetRefKeys = new Set(
    installedKibanaAssetsRefs.map((asset: KibanaAssetReference) => `${asset.id}-${asset.type}`)
  );
  // Do not remove alerting rules or alerting rule templates (they are managed separately)
  const assetsToRemove = previousAssetRefs.filter(
    (existingAsset) =>
      !nextAssetRefKeys.has(`${existingAsset.id}-${existingAsset.type}`) &&
      existingAsset.type !== KibanaSavedObjectType.alert &&
      existingAsset.type !== KibanaSavedObjectType.alertingRuleTemplate
  );

  if (assetsToRemove.length === 0) {
    return;
  }

  await withPackageSpan('Clean up Kibana assets that are no longer in the package', async () => {
    await deleteKibanaAssets({
      installedObjects: assetsToRemove,
      spaceId,
      packageSpecConditions: packageInfo?.conditions,
      logger,
    });
  });
}
