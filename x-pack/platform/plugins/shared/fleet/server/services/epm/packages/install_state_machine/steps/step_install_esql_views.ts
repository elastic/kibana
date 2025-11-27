/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { cleanupEsqlViews, deleteKibanaAssets } from '../../remove';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { INSTALL_STATES, KibanaSavedObjectType } from '../../../../../../common/types';
import { installEsqlViews } from '../../../elasticsearch/esql_views/install';

export async function stepInstallEsqlViews(context: InstallContext) {
  const { savedObjectsClient, esClient, logger, packageInstallContext, installedPkg } = context;

  let esReferences =
    context.esReferences ?? context.esReferences ?? installedPkg?.attributes.installed_es ?? [];

  if (appContextService.getExperimentalFeatures().enableEsqlViewInstall !== true) {
    return { esReferences };
  }

  esReferences = await withPackageSpan('Install ESQL views', () =>
    installEsqlViews({
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
    })
  );

  return { esReferences };
}

export async function cleanupEsqlViewsStep(context: InstallContext) {
  const { logger, installedPkg, esClient, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed esql views
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_ESQL_VIEWS &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;

    logger.debug('Retry transition - clean up transforms');
    await withPackageSpan('Retry transition - clean up ilm transforms', async () => {
      await cleanupEsqlViews(installedEs, esClient);
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
  const assetsToRemove = previousAssetRefs.filter(
    (existingAsset) => !nextAssetRefKeys.has(`${existingAsset.id}-${existingAsset.type}`)
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
