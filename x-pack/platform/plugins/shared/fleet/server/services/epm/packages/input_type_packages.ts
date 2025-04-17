/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import type { NewPackagePolicy, PackageInfo } from '../../../types';
import { DATASET_VAR_NAME } from '../../../../common/constants';
import { PackagePolicyValidationError, PackageNotFoundError } from '../../../errors';

import { dataStreamService } from '../..';

import * as Registry from '../registry';

import { createArchiveIteratorFromMap } from '../archive/archive_iterator';

import { getNormalizedDataStreams } from '../../../../common/services';

import { generateESIndexPatterns } from '../elasticsearch/template/template';

import type { PackageInstallContext } from '../../../../common/types';

import { getInstalledPackageWithAssets } from './get';

import { installIndexTemplatesAndPipelines } from './install_index_template_pipeline';
import { optimisticallyAddEsAssetReferences } from './es_assets_reference';
import { removeInstallation } from './remove';

// install the assets needed for inputs type packages
export async function installAssetsForInputPackagePolicy(opts: {
  pkgInfo: PackageInfo;
  logger: Logger;
  packagePolicy: NewPackagePolicy;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  force: boolean;
}) {
  const { pkgInfo, logger, packagePolicy, esClient, soClient, force } = opts;

  if (pkgInfo.type !== 'input') return;

  const datasetName = packagePolicy.inputs[0].streams[0].vars?.[DATASET_VAR_NAME]?.value;
  const [dataStream] = getNormalizedDataStreams(pkgInfo, datasetName);
  const existingDataStreams = await dataStreamService.getMatchingDataStreams(esClient, {
    type: dataStream.type,
    dataset: datasetName,
  });

  if (existingDataStreams.length) {
    const existingDataStreamsAreFromDifferentPackage = existingDataStreams.some(
      (ds) => ds._meta?.package?.name !== pkgInfo.name
    );
    if (existingDataStreamsAreFromDifferentPackage && !force) {
      // user has opted to send data to an existing data stream which is managed by another
      // package. This means certain custom setting such as elasticsearch settings
      // defined by the package will not have been applied which could lead
      // to unforeseen circumstances, so force flag must be used.
      const streamIndexPattern = dataStreamService.streamPartsToIndexPattern({
        type: dataStream.type,
        dataset: datasetName,
      });

      throw new PackagePolicyValidationError(
        `Datastreams matching "${streamIndexPattern}" already exist and are not managed by this package, force flag is required`
      );
    } else {
      logger.info(
        `Data stream for dataset ${datasetName} already exists, skipping index template creation for ${packagePolicy.id}`
      );
      return;
    }
  }

  const existingIndexTemplate = await dataStreamService.getMatchingIndexTemplate(esClient, {
    type: dataStream.type,
    dataset: datasetName,
  });

  if (existingIndexTemplate) {
    const indexTemplateOwnnedByDifferentPackage =
      existingIndexTemplate._meta?.package?.name !== pkgInfo.name;
    if (indexTemplateOwnnedByDifferentPackage && !force) {
      // index template already exists but there is no data stream yet
      // we do not want to override the index template

      throw new PackagePolicyValidationError(
        `Index template "${dataStream.type}-${datasetName}" already exist and is not managed by this package, force flag is required`
      );
    } else {
      logger.info(
        `Index template "${dataStream.type}-${datasetName}" already exists, skipping index template creation for ${packagePolicy.id}`
      );
      return;
    }
  }

  const installedPkgWithAssets = await getInstalledPackageWithAssets({
    savedObjectsClient: soClient,
    pkgName: pkgInfo.name,
    logger,
  });
  let packageInstallContext: PackageInstallContext | undefined;
  if (!installedPkgWithAssets) {
    throw new PackageNotFoundError(
      `Error while creating index templates: unable to find installed package ${pkgInfo.name}`
    );
  }
  try {
    if (installedPkgWithAssets.installation.version !== pkgInfo.version) {
      const pkg = await Registry.getPackage(pkgInfo.name, pkgInfo.version, {
        ignoreUnverified: force,
      });

      const archiveIterator = createArchiveIteratorFromMap(pkg.assetsMap);
      packageInstallContext = {
        packageInfo: pkg.packageInfo,
        paths: pkg.paths,
        archiveIterator,
      };
    } else {
      const archiveIterator = createArchiveIteratorFromMap(installedPkgWithAssets.assetsMap);
      packageInstallContext = {
        packageInfo: installedPkgWithAssets.packageInfo,
        paths: installedPkgWithAssets.paths,
        archiveIterator,
      };
    }

    await installIndexTemplatesAndPipelines({
      installedPkg: installedPkgWithAssets.installation,
      packageInstallContext,
      esReferences: installedPkgWithAssets.installation.installed_es || [],
      savedObjectsClient: soClient,
      esClient,
      logger,
      onlyForDataStreams: [dataStream],
    });
    // Upate ES index patterns
    await optimisticallyAddEsAssetReferences(
      soClient,
      installedPkgWithAssets.installation.name,
      [],
      generateESIndexPatterns([dataStream])
    );
  } catch (error) {
    logger.warn(`installAssetsForInputPackagePolicy error: ${error}`);
  }
}

// Remove the assets installed for inputs type packages
export async function removeAssetsForInputPackagePolicy(opts: {
  packageInfo: PackageInfo;
  logger: Logger;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}) {
  const { logger, packageInfo, esClient, soClient } = opts;
  if (packageInfo.type !== 'input') return;

  if (packageInfo.status === 'installed') {
    logger.info(
      `Removing assets for package '${packageInfo.name}-${packageInfo.version}' - package type: 'inputs'`
    );
    try {
      await removeInstallation({
        savedObjectsClient: soClient,
        pkgName: packageInfo!.name,
        pkgVersion: packageInfo!.name,
        esClient,
      });
    } catch (error) {
      logger.error(`Uninstalling package: ${packageInfo!.name} failed`, { error });
    }
  }
}
