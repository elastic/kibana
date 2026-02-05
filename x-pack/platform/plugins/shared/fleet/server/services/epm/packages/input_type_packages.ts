/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicy,
  RegistryPolicyInputOnlyTemplate,
} from '../../../types';
import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
  OTEL_COLLECTOR_INPUT_TYPE,
} from '../../../../common/constants';
import { PackagePolicyValidationError, PackageNotFoundError, FleetError } from '../../../errors';

import { dataStreamService } from '../..';

import * as Registry from '../registry';

import { createArchiveIteratorFromMap } from '../archive/archive_iterator';

import { getNormalizedDataStreams } from '../../../../common/services';

import { generateESIndexPatterns } from '../elasticsearch/template/template';

import type { PackageInstallContext } from '../../../../common/types';

import { getInstallation, getInstalledPackageWithAssets } from './get';

import { installIndexTemplatesAndPipelines } from './install_index_template_pipeline';
import { optimisticallyAddEsAssetReferences } from './es_assets_reference';
import { cleanupAssets } from './remove';

export const getDatasetName = (packagePolicyInput: NewPackagePolicyInput[]): string =>
  packagePolicyInput[0].streams[0]?.vars?.[DATASET_VAR_NAME]?.value;

export const findDataStreamsFromDifferentPackages = async (
  datasetName: string,
  pkgInfo: PackageInfo,
  esClient: ElasticsearchClient,
  dataStreamType?: string
) => {
  const [dataStream] = getNormalizedDataStreams(pkgInfo, datasetName, dataStreamType);
  const existingDataStreams = await dataStreamService.getMatchingDataStreams(esClient, {
    type: dataStream.type,
    dataset: datasetName,
  });
  return { dataStream, existingDataStreams };
};

export const checkExistingDataStreamsAreFromDifferentPackage = (
  pkgInfo: PackageInfo,
  existingDataStreams: IndicesDataStream[]
) => {
  return (existingDataStreams || []).some((ds) => ds._meta?.package?.name !== pkgInfo.name);
};

export const isInputPackageDatasetUsedByMultiplePolicies = (
  packagePolicies: PackagePolicy[],
  datasetName: string,
  pkgName: string
) => {
  const allStreams = packagePolicies
    .filter(
      (packagePolicy) =>
        packagePolicy?.package?.name === pkgName || packagePolicy?.package?.type === 'input'
    )
    .flatMap((packagePolicy) => {
      return packagePolicy?.inputs[0]?.streams ?? [];
    });
  const filtered = allStreams.filter(
    (stream) => stream.vars?.[DATASET_VAR_NAME]?.value === datasetName
  );

  return filtered.length > 1;
};

export const hasDynamicSignalTypes = (packageInfo?: PackageInfo): boolean => {
  if (!packageInfo) {
    return false;
  }
  const inputOnlyTemplate = packageInfo.policy_templates?.find(
    (template) => 'input' in template && template.input === OTEL_COLLECTOR_INPUT_TYPE
  ) as RegistryPolicyInputOnlyTemplate | undefined;

  return inputOnlyTemplate?.dynamic_signal_types === true;
};

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

  const datasetName = getDatasetName(packagePolicy.inputs);

  // For OTel packages with dynamic_signal_types, we need to create index templates for all signal types
  const isDynamicSignalTypes = hasDynamicSignalTypes(pkgInfo);
  const signalTypes: string[] = isDynamicSignalTypes
    ? ['logs', 'metrics', 'traces']
    : [
        packagePolicy.inputs[0].streams[0].vars?.[DATA_STREAM_TYPE_VAR_NAME]?.value ||
          packagePolicy.inputs[0].streams[0].data_stream?.type ||
          'logs',
      ];

  // Check each signal type and install templates as needed
  for (const dataStreamType of signalTypes) {
    await installAssetsForDataStreamType({
      pkgInfo,
      logger,
      datasetName,
      dataStreamType,
      esClient,
      soClient,
      force,
    });
  }
}

async function installAssetsForDataStreamType(opts: {
  pkgInfo: PackageInfo;
  logger: Logger;
  datasetName: string;
  dataStreamType: string;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  force: boolean;
}) {
  const { pkgInfo, logger, datasetName, dataStreamType, esClient, soClient, force } = opts;

  const { dataStream, existingDataStreams } = await findDataStreamsFromDifferentPackages(
    datasetName,
    pkgInfo,
    esClient,
    dataStreamType
  );

  if (existingDataStreams.length) {
    const existingDataStreamsAreFromDifferentPackage =
      checkExistingDataStreamsAreFromDifferentPackage(pkgInfo, existingDataStreams);
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
        `Data stream for dataset ${datasetName} already exists, skipping index template creation`
      );
      return;
    }
  }

  const existingIndexTemplate = await dataStreamService.getMatchingIndexTemplate(esClient, {
    type: dataStream.type,
    dataset: datasetName,
  });

  if (existingIndexTemplate) {
    const indexTemplateOwnedByDifferentPackage =
      existingIndexTemplate._meta?.package?.name !== pkgInfo.name;
    if (indexTemplateOwnedByDifferentPackage && !force) {
      // index template already exists but there is no data stream yet
      // we do not want to override the index template
      throw new PackagePolicyValidationError(
        `Index template "${dataStream.type}-${datasetName}" already exist and is not managed by this package, force flag is required`
      );
    } else {
      logger.info(
        `Index template "${dataStream.type}-${datasetName}" already exists, skipping index template creation`
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

// Remove the assets installed for input-type packages
export async function removeAssetsForInputPackagePolicy(opts: {
  packageInfo: PackageInfo;
  datasetName: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const { logger, packageInfo, esClient, savedObjectsClient, datasetName } = opts;

  if (packageInfo.type === 'input' && packageInfo.status === 'installed') {
    logger.info(`Removing assets for input package ${packageInfo.name}:${packageInfo.version}`);
    try {
      const installation = await getInstallation({
        savedObjectsClient,
        pkgName: packageInfo.name,
      });

      if (!installation) {
        throw new FleetError(`${packageInfo.name} is not installed`);
      }
      const {
        installed_es: installedEs,
        installed_kibana: installedKibana,
        es_index_patterns: esIndexPatterns,
      } = installation;

      // regex matching names with word boundary, allows to match `generic` and not `generic1`
      const regex = new RegExp(`${datasetName}\\b`);
      const filteredInstalledEs = installedEs.filter((asset) => asset.id.search(regex) > -1);
      const filteredInstalledKibana = installedKibana.filter(
        (asset) => asset.id.search(regex) > -1
      );
      const filteredEsIndexPatterns: Record<string, string> = {};
      if (esIndexPatterns) {
        filteredEsIndexPatterns[datasetName] = esIndexPatterns[datasetName];
      }
      const installationToDelete = {
        ...installation,
        installed_es: filteredInstalledEs,
        installed_kibana: filteredInstalledKibana,
        es_index_patterns: filteredEsIndexPatterns,
        package_assets: [],
      };

      await cleanupAssets(
        datasetName,
        installationToDelete,
        installation,
        esClient,
        savedObjectsClient
      );
    } catch (error) {
      logger.error(
        `Failed to remove assets for input package ${packageInfo.name}:${packageInfo.version}: ${error.message}`
      );
    }
  }
}
