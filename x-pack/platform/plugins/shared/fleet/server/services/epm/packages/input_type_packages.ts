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
  RegistryDataStream,
} from '../../../types';
import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
  OTEL_COLLECTOR_INPUT_TYPE,
} from '../../../../common/constants';
import { PackagePolicyValidationError, PackageNotFoundError, FleetError } from '../../../errors';

import { packagePolicyService } from '../..';

import { dataStreamService } from '../..';

import * as Registry from '../registry';

import { createArchiveIteratorFromMap } from '../archive/archive_iterator';

import { getNormalizedDataStreams, hasDynamicSignalTypes } from '../../../../common/services';

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
  if (!dataStream.type) {
    throw new FleetError(`Expected data_stream.type to be defined for dataset "${datasetName}"`);
  }
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
  return (existingDataStreams || []).some(
    (ds) => ds._meta?.package?.name && ds._meta.package.name !== pkgInfo.name
  );
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
      inputType: packagePolicy.inputs[0].type,
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
  inputType: string;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  force: boolean;
}) {
  const { pkgInfo, logger, datasetName, dataStreamType, inputType, esClient, soClient, force } =
    opts;

  const { dataStream, existingDataStreams } = await findDataStreamsFromDifferentPackages(
    datasetName,
    pkgInfo,
    esClient,
    dataStreamType
  );

  applyTimeSeriesIndexMode({
    dataStream,
    inputType,
    dataStreamType,
    pkgName: pkgInfo.name,
    logger,
  });

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
    }
    if (existingDataStreamsAreFromDifferentPackage && force) {
      logger.info(
        `Data stream for dataset ${datasetName} already exists, but is managed by a different package, skipping index template creation`
      );
      return;
    }
    if (!force) {
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
      existingIndexTemplate._meta?.package?.name &&
      existingIndexTemplate._meta.package.name !== pkgInfo.name;
    if (indexTemplateOwnedByDifferentPackage && !force) {
      // index template already exists but there is no data stream yet
      // we do not want to override the index template
      throw new PackagePolicyValidationError(
        `Index template "${dataStream.type}-${datasetName}" already exist and is not managed by this package, force flag is required`
      );
    }
    if (indexTemplateOwnedByDifferentPackage && force) {
      logger.info(
        `Index template "${dataStream.type}-${datasetName}" already exists, but is managed by a different package, skipping index template creation`
      );
      return;
    }
    if (!force) {
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

    // Update ES index patterns
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

/**
 * Returns the subset of streams in an integration package policy where the user has
 * overridden `data_stream.dataset` with a custom value different from the package default.
 */
export function getCustomDatasetStreams(
  packagePolicy: NewPackagePolicy | PackagePolicy,
  pkgInfo: PackageInfo
): Array<{ originalDataStream: RegistryDataStream; customDatasetName: string }> {
  const results: Array<{ originalDataStream: RegistryDataStream; customDatasetName: string }> = [];
  for (const input of packagePolicy.inputs) {
    for (const stream of input.streams ?? []) {
      const customVal = stream.vars?.[DATASET_VAR_NAME]?.value;
      if (!customVal || customVal === stream.data_stream.dataset) continue;
      const originalDataStream = pkgInfo.data_streams?.find(
        (ds) => ds.dataset === stream.data_stream.dataset
      );
      if (originalDataStream) {
        results.push({ originalDataStream, customDatasetName: customVal });
      }
    }
  }
  return results;
}

/**
 * Installs index templates and pipelines for integration package policies that override
 * `data_stream.dataset`. Mirrors the behavior of `installAssetsForInputPackagePolicy` but
 * synthesizes a custom RegistryDataStream from the original rather than building one from scratch.
 */
export async function installAssetsForIntegrationPackagePolicyCustomDatasets(opts: {
  pkgInfo: PackageInfo;
  logger: Logger;
  packagePolicy: NewPackagePolicy | PackagePolicy;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  force: boolean;
}) {
  const { pkgInfo, logger, packagePolicy, esClient, soClient, force } = opts;

  if (pkgInfo.type !== 'integration') return;

  const customStreams = getCustomDatasetStreams(packagePolicy, pkgInfo);
  if (customStreams.length === 0) return;

  for (const { originalDataStream, customDatasetName } of customStreams) {
    const customDataStream: RegistryDataStream = {
      ...originalDataStream,
      dataset: customDatasetName,
      path: customDatasetName,
    };

    const existingDataStreams = await dataStreamService.getMatchingDataStreams(esClient, {
      type: customDataStream.type,
      dataset: customDatasetName,
    });

    if (existingDataStreams.length) {
      const fromDifferentPackage = checkExistingDataStreamsAreFromDifferentPackage(
        pkgInfo,
        existingDataStreams
      );
      if (fromDifferentPackage && !force) {
        const streamIndexPattern = dataStreamService.streamPartsToIndexPattern({
          type: customDataStream.type,
          dataset: customDatasetName,
        });
        throw new PackagePolicyValidationError(
          `Datastreams matching "${streamIndexPattern}" already exist and are not managed by this package, force flag is required`
        );
      }
      if (fromDifferentPackage && force) {
        logger.info(
          `Data stream for dataset ${customDatasetName} already exists, but is managed by a different package, skipping index template creation`
        );
        continue;
      }
      if (!force) {
        logger.info(
          `Data stream for dataset ${customDatasetName} already exists, skipping index template creation`
        );
        continue;
      }
    }

    const existingIndexTemplate = await dataStreamService.getMatchingIndexTemplate(esClient, {
      type: customDataStream.type,
      dataset: customDatasetName,
    });

    if (existingIndexTemplate) {
      const ownedByDifferentPackage =
        existingIndexTemplate._meta?.package?.name &&
        existingIndexTemplate._meta.package.name !== pkgInfo.name;
      if (ownedByDifferentPackage && !force) {
        throw new PackagePolicyValidationError(
          `Index template "${customDataStream.type}-${customDatasetName}" already exist and is not managed by this package, force flag is required`
        );
      }
      if (ownedByDifferentPackage && force) {
        logger.info(
          `Index template "${customDataStream.type}-${customDatasetName}" already exists, but is managed by a different package, skipping index template creation`
        );
        continue;
      }
      if (!force) {
        logger.info(
          `Index template "${customDataStream.type}-${customDatasetName}" already exists, skipping index template creation`
        );
        continue;
      }
    }

    const installedPkgWithAssets = await getInstalledPackageWithAssets({
      savedObjectsClient: soClient,
      pkgName: pkgInfo.name,
      logger,
    });

    if (!installedPkgWithAssets) {
      throw new PackageNotFoundError(
        `Error while creating index templates: unable to find installed package ${pkgInfo.name}`
      );
    }

    try {
      let packageInstallContext: import('../../../../common/types').PackageInstallContext;
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
        onlyForDataStreams: [customDataStream],
      });

      await optimisticallyAddEsAssetReferences(
        soClient,
        installedPkgWithAssets.installation.name,
        [],
        generateESIndexPatterns([customDataStream])
      );
    } catch (error) {
      logger.warn(`installAssetsForIntegrationPackagePolicyCustomDatasets error: ${error}`);
    }
  }
}

/**
 * Removes index templates and pipelines installed for a custom `data_stream.dataset` on an
 * integration package policy, but only when no other policy for the same package still uses
 * the same custom dataset name for the same data stream type.
 */
export async function removeAssetsForIntegrationPackagePolicyCustomDatasets(opts: {
  packageInfo: PackageInfo;
  packagePolicy: PackagePolicy;
  logger: Logger;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}) {
  const { packageInfo, packagePolicy, logger, esClient, soClient } = opts;

  if (packageInfo.type !== 'integration' || packageInfo.status !== 'installed') return;

  const customStreams = getCustomDatasetStreams(packagePolicy, packageInfo);
  if (customStreams.length === 0) return;

  logger.info(
    `Removing custom dataset assets for integration package ${packageInfo.name}:${packageInfo.version}`
  );

  try {
    const installation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packageInfo.name,
    });

    if (!installation) {
      logger.warn(`${packageInfo.name} is not installed, skipping custom dataset asset removal`);
      return;
    }

    // Load all other policies for the same package to check if the custom dataset is still in use
    const { items: allPolicies } = await packagePolicyService.list(soClient, {
      kuery: `ingest-package-policies.package.name: "${packageInfo.name}"`,
      perPage: 10000,
    });

    const {
      installed_es: installedEs,
      installed_kibana: installedKibana,
      es_index_patterns: esIndexPatterns,
    } = installation;

    for (const { originalDataStream, customDatasetName } of customStreams) {
      // Check if any OTHER policy for the same package still uses this custom dataset
      // for the same data stream type. Exact match (not regex) to avoid prefix collisions.
      const stillInUse = allPolicies
        .filter((p) => p.id !== packagePolicy.id)
        .some((p) =>
          getCustomDatasetStreams(p, packageInfo).some(
            (s) =>
              s.customDatasetName === customDatasetName &&
              s.originalDataStream.type === originalDataStream.type
          )
        );

      if (stillInUse) {
        logger.info(
          `Custom dataset "${customDatasetName}" is still used by another policy, skipping asset removal`
        );
        continue;
      }

      // Use exact string match (not word-boundary regex) to avoid collisions between
      // dataset names that share a prefix (e.g. "nginx" vs "nginx_extra").
      const filteredInstalledEs = installedEs.filter((asset) => {
        const parts = asset.id.split('-');
        // Index template IDs have the form "{type}-{dataset}" — match the dataset part exactly
        return parts.length >= 2 && parts.slice(1).join('-') === customDatasetName;
      });
      const filteredInstalledKibana = installedKibana.filter((asset) => {
        const parts = asset.id.split('-');
        return parts.length >= 2 && parts.slice(1).join('-') === customDatasetName;
      });
      const filteredEsIndexPatterns: Record<string, string> = {};
      if (esIndexPatterns?.[customDatasetName]) {
        filteredEsIndexPatterns[customDatasetName] = esIndexPatterns[customDatasetName];
      }

      if (
        filteredInstalledEs.length === 0 &&
        filteredInstalledKibana.length === 0 &&
        Object.keys(filteredEsIndexPatterns).length === 0
      ) {
        logger.info(
          `No tracked assets found for custom dataset "${customDatasetName}", skipping cleanup`
        );
        continue;
      }

      const installationToDelete = {
        ...installation,
        installed_es: filteredInstalledEs,
        installed_kibana: filteredInstalledKibana,
        es_index_patterns: filteredEsIndexPatterns,
        package_assets: [],
      };

      await cleanupAssets(
        customDatasetName,
        installationToDelete,
        installation,
        esClient,
        soClient
      );
    }
  } catch (error) {
    logger.error(
      `Failed to remove custom dataset assets for integration package ${packageInfo.name}:${packageInfo.version}: ${error.message}`
    );
  }
}

/**
 * Applies time_series index mode rules to a data stream:
 * - Removes time_series index mode for non-metrics data streams
 * - Adds time_series index mode for OTel metrics data streams if not present
 * - Preserves existing time_series index mode for metrics data streams
 */
export const applyTimeSeriesIndexMode = ({
  dataStream,
  inputType,
  dataStreamType,
  pkgName,
  logger,
}: {
  dataStream: RegistryDataStream;
  inputType: string;
  dataStreamType: string;
  pkgName: string;
  logger: Logger;
}): void => {
  const isOTelInput = inputType === OTEL_COLLECTOR_INPUT_TYPE;
  const isMetricsType = dataStreamType === 'metrics';

  // For OTel inputs with metrics type, preserve time_series index mode
  // For all other cases, only preserve time_series for metrics type
  const shouldRemoveTimeSeries =
    !isMetricsType && dataStream.elasticsearch?.index_mode === 'time_series';

  if (shouldRemoveTimeSeries) {
    logger.debug(
      `Ignoring time_series index mode for package "${pkgName}" ` +
        `because data stream type is "${dataStreamType}" (time_series only wanted with "metrics" type)`
    );

    // Remove time_series index mode from dataStream.
    if (dataStream.elasticsearch) {
      const { index_mode, ...restElasticsearch } = dataStream.elasticsearch;
      dataStream.elasticsearch = restElasticsearch;
    }
  } else if (isOTelInput && isMetricsType && !dataStream.elasticsearch?.index_mode) {
    // For OTel metrics data streams, add time_series index mode if not already present
    logger.debug(
      `Adding time_series index mode for OTel package "${pkgName}" ` +
        `because data stream type is "${dataStreamType}"`
    );

    if (!dataStream.elasticsearch) {
      dataStream.elasticsearch = {};
    }
    dataStream.elasticsearch.index_mode = 'time_series';
  }
};
