/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import { ElasticsearchAssetType } from '../../../../common';
import type { Installation } from '../../../../common';
import {
  dataStreamUsesOtelInput,
  getRegistryDataStreamAssetBaseName,
  isValidDataset,
  isValidDataStreamType,
} from '../../../../common/services';
import { PackageInvalidArchiveError, PackageNotFoundError } from '../../../errors';
import { appContextService } from '../../app_context';
import { airGappedUtils } from '../airgapped';
import { getPathParts } from '../archive';
import { isTopLevelPipeline } from '../elasticsearch/ingest_pipeline/helpers';
import * as Registry from '../registry';

import { getBundledPackageByName } from './bundled_packages';
import { getPackageSavedObjects } from './get';

const UPLOAD_PACKAGE_NAME_MIN_LENGTH = 2;
const UPLOAD_PACKAGE_NAME_MAX_LENGTH = 150;
const UPLOAD_PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

interface UploadDataStream {
  dataset: string;
  type?: string;
  hidden?: boolean;
  dataset_is_prefix?: boolean;
  streams?: Array<{ input?: string }>;
  elasticsearch?: {
    privileges?: { cluster?: string[]; indices?: string[] };
    dynamic_dataset?: boolean;
    dynamic_namespace?: boolean;
  };
}

interface UploadPolicyTemplate {
  dynamic_signal_types?: boolean;
  inputs?: Array<{ dynamic_signal_types?: boolean; name?: string; type?: string }>;
}

interface UploadPackageInfo {
  name: string;
  type?: string;
  elasticsearch?: {
    privileges?: { cluster?: string[]; indices?: string[] };
  };
  policy_templates?: UploadPolicyTemplate[];
  data_streams?: UploadDataStream[];
}

const FORBIDDEN_ARCHIVE_TYPES = new Set<string>([
  ElasticsearchAssetType.indexTemplate,
  ElasticsearchAssetType.componentTemplate,
]);

export async function validatePackageUpload({
  packageInfo,
  paths,
  installedPkg,
  savedObjectsClient,
  esClient,
}: {
  packageInfo: UploadPackageInfo;
  paths: string[];
  installedPkg?: SavedObject<Installation>;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}): Promise<void> {
  // Test/development escape hatch (e.g. elastic-package stacks, FTR suites): skip
  // every upload validation so uploads behave as if this validator did not exist.
  if (appContextService.getConfig()?.internal?.skipUploadPackageValidation) {
    return;
  }

  assertValidUploadPackageName(packageInfo.name);
  assertNoForbiddenArchiveAssets(paths);
  assertValidUploadDataStreams(packageInfo.data_streams ?? []);
  await assertDoesNotShadowInstalledPackage(packageInfo.name, installedPkg);
  await assertNotRegistryOrBundledName(packageInfo.name, installedPkg);
  // Residual: Kibana saved objects in the archive are still imported with overwrite: true.
  // Preflight only; an upload can race any first install (upload, registry, or setup).
  await assertNoOwnedDatasetCollision(packageInfo, savedObjectsClient);
  await assertNoUnownedLiveDataStreams(packageInfo, esClient, installedPkg);
}

function assertValidUploadPackageName(name: string): void {
  if (
    name.length < UPLOAD_PACKAGE_NAME_MIN_LENGTH ||
    name.length > UPLOAD_PACKAGE_NAME_MAX_LENGTH ||
    !UPLOAD_PACKAGE_NAME_PATTERN.test(name)
  ) {
    throw new PackageInvalidArchiveError(
      i18n.translate('xpack.fleet.packageUpload.invalidPackageName', {
        defaultMessage:
          'Uploaded package name "{name}" is invalid. Use a lowercase identifier with letters, numbers, and underscores only.',
        values: { name },
      })
    );
  }
}

function assertNoForbiddenArchiveAssets(paths: string[]): void {
  for (const path of paths) {
    if (path.endsWith('/')) {
      continue;
    }

    const { type } = getPathParts(path);
    if (FORBIDDEN_ARCHIVE_TYPES.has(type) || isTopLevelPipeline(path)) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.forbiddenArchiveAsset', {
          defaultMessage: 'Uploaded package contains a forbidden asset: {path}',
          values: { path },
        })
      );
    }
  }
}

function assertValidUploadDataStreams(dataStreams: UploadDataStream[]): void {
  for (const dataStream of dataStreams) {
    const typeResult = isValidDataStreamType(dataStream.type ?? '');
    if (!typeResult.valid) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.invalidDataStreamType', {
          defaultMessage: 'Uploaded package declares invalid data stream type "{type}": {reason}',
          values: { type: dataStream.type ?? '', reason: typeResult.error ?? '' },
        })
      );
    }

    const datasetResult = isValidDataset(dataStream.dataset);
    if (!datasetResult.valid || dataStream.dataset.includes('@')) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.invalidDataset', {
          defaultMessage: 'Uploaded package declares invalid dataset "{dataset}".',
          values: { dataset: dataStream.dataset },
        })
      );
    }
  }
}

async function assertDoesNotShadowInstalledPackage(
  name: string,
  installedPkg?: SavedObject<Installation>
): Promise<void> {
  if (!installedPkg) {
    return;
  }

  const installSource = installedPkg.attributes.install_source;
  const isLegacyBundled =
    installSource === 'upload' &&
    Boolean(await getBundledPackageByName(installedPkg.attributes.name));

  if (installSource === 'upload' && !isLegacyBundled) {
    return;
  }

  throw new PackageInvalidArchiveError(
    i18n.translate('xpack.fleet.packageUpload.registryPackageShadow', {
      defaultMessage:
        'Cannot upload a package that replaces the {installSource}-installed package "{name}".',
      values: { name, installSource: isLegacyBundled ? 'bundled' : installSource || 'existing' },
    })
  );
}

async function assertNotRegistryOrBundledName(
  name: string,
  installedPkg?: SavedObject<Installation>
): Promise<void> {
  if (await isTrustedUploadInstallation(installedPkg)) {
    return;
  }

  if (airGappedUtils().shouldSkipRegistryRequests) {
    // The registry is never contacted for installs in air-gapped mode, so there is
    // nothing for a pre-squatted registry name to intercept. Only the locally known
    // bundled packages can still be shadowed, so that is all we check here.
    const bundledPackage = await getBundledPackageByName(name);
    if (bundledPackage) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.registryPackageName', {
          defaultMessage:
            'Cannot upload a package whose name already exists in the package registry or as a bundled package: {name}',
          values: { name },
        })
      );
    }

    return;
  }

  try {
    await Registry.fetchFindLatestPackageOrThrow(name, {
      ignoreConstraints: true,
      prerelease: true,
      throwOnError: true,
    });
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      return;
    }

    throw new PackageInvalidArchiveError(
      i18n.translate('xpack.fleet.packageUpload.registryUnavailable', {
        defaultMessage:
          'Could not verify that uploaded package name "{name}" is not a registry or bundled package. If this deployment intentionally has no access to the package registry, configure Fleet for air-gapped operation (`xpack.fleet.isAirGapped: true`).',
        values: { name },
      })
    );
  }

  throw new PackageInvalidArchiveError(
    i18n.translate('xpack.fleet.packageUpload.registryPackageName', {
      defaultMessage:
        'Cannot upload a package whose name already exists in the package registry or as a bundled package: {name}',
      values: { name },
    })
  );
}

async function isTrustedUploadInstallation(
  installedPkg?: SavedObject<Installation>
): Promise<boolean> {
  if (installedPkg?.attributes.install_source !== 'upload') {
    return false;
  }

  return !(await isLegacyBundledUpload(installedPkg));
}

async function isLegacyBundledUpload(installedPkg: SavedObject<Installation>): Promise<boolean> {
  const bundledPackage = await getBundledPackageByName(installedPkg.attributes.name);
  return Boolean(bundledPackage);
}

async function assertNoOwnedDatasetCollision(
  packageInfo: UploadPackageInfo,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> {
  const requestedAssetNames = (packageInfo.data_streams ?? []).map((dataStream) =>
    getRegistryDataStreamAssetBaseName({
      type: dataStream.type ?? '',
      dataset: dataStream.dataset,
      hidden: dataStream.hidden,
    })
  );

  if (requestedAssetNames.length === 0) {
    return;
  }

  const { saved_objects: installations } = await getPackageSavedObjects(savedObjectsClient);

  for (const installation of installations) {
    if (installation.attributes.name === packageInfo.name) {
      continue;
    }

    const ownedAssetNames = (installation.attributes.installed_es ?? [])
      .filter((asset) => asset.type === ElasticsearchAssetType.indexTemplate)
      .map((asset) => assetBaseNameFromTemplateId(asset.id))
      .filter((assetName): assetName is string => Boolean(assetName));

    const conflict = requestedAssetNames.find((assetName) =>
      ownedAssetNames.some((ownedAssetName) => assetNamesOverlap(assetName, ownedAssetName))
    );

    if (conflict) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.datasetOwned', {
          defaultMessage:
            'Uploaded package declares dataset "{dataset}" that is already owned by installed package "{packageName}".',
          values: {
            dataset: conflict,
            packageName: installation.attributes.name,
          },
        })
      );
    }
  }
}

function assetNamesOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

function assetBaseNameFromTemplateId(id: string): string | undefined {
  const base = id.split('@')[0];
  return base || undefined;
}

async function assertNoUnownedLiveDataStreams(
  packageInfo: UploadPackageInfo,
  esClient: ElasticsearchClient,
  installedPkg?: SavedObject<Installation>
): Promise<void> {
  for (const dataStream of packageInfo.data_streams ?? []) {
    const matching = await fetchMatchingLiveDataStreams(
      esClient,
      liveDataStreamIndexPattern(dataStream, packageInfo),
      dataStream.dataset
    );

    if (matching.length === 0) {
      continue;
    }

    if (!installedPkg) {
      throw existingLiveDataStreamError(dataStream.dataset, matching[0].name);
    }

    const unowned = matching.find(
      (liveStream) => ownedPackageName(liveStream) !== installedPkg.attributes.name
    );

    if (!unowned) {
      continue;
    }

    throw existingLiveDataStreamError(dataStream.dataset, unowned.name);
  }
}

function existingLiveDataStreamError(
  dataset: string,
  dataStreamName: string
): PackageInvalidArchiveError {
  return new PackageInvalidArchiveError(
    i18n.translate('xpack.fleet.packageUpload.existingDataStream', {
      defaultMessage:
        'A matching live data stream "{dataStreamName}" already exists for dataset "{dataset}" and must be migrated or removed before uploading a new package.',
      values: {
        dataset,
        dataStreamName,
      },
    })
  );
}

function liveDataStreamIndexPattern(
  dataStream: UploadDataStream,
  packageInfo: UploadPackageInfo
): string {
  const isOtelInputType = isOtelUploadDataStream(packageInfo, dataStream);
  const assetBaseName = getRegistryDataStreamAssetBaseName(
    {
      type: dataStream.type ?? '',
      dataset: dataStream.dataset,
      hidden: dataStream.hidden,
    },
    isOtelInputType
  );
  return dataStream.dataset_is_prefix ? `${assetBaseName}.*-*` : `${assetBaseName}-*`;
}

function isOtelUploadDataStream(
  packageInfo: UploadPackageInfo,
  dataStream: UploadDataStream
): boolean {
  if (!appContextService.getExperimentalFeatures()?.enableOtelIntegrations) {
    return false;
  }

  return dataStreamUsesOtelInput(
    {
      policy_templates: packageInfo.policy_templates?.map((template) => ({
        name: '',
        title: '',
        description: '',
        inputs: (template.inputs ?? []).map((input) => ({
          type: input.type ?? '',
          title: '',
          description: '',
          name: input.name,
        })),
      })),
    },
    {
      streams: (dataStream.streams ?? []).map((stream) => ({
        input: stream.input ?? '',
        title: '',
      })),
    }
  );
}

async function fetchMatchingLiveDataStreams(
  esClient: ElasticsearchClient,
  pattern: string,
  dataset: string
): Promise<Array<{ name: string; _meta?: Record<string, unknown> }>> {
  try {
    const body = await esClient.indices.getDataStream({
      name: pattern,
      expand_wildcards: ['open', 'hidden'],
    });
    return body.data_streams ?? [];
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw new PackageInvalidArchiveError(
      i18n.translate('xpack.fleet.packageUpload.dataStreamLookupFailed', {
        defaultMessage:
          'Could not verify that uploaded package dataset "{dataset}" does not match an existing Elasticsearch data stream.',
        values: { dataset },
      })
    );
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404
  );
}

function ownedPackageName(dataStream: { _meta?: Record<string, unknown> }): string | undefined {
  const meta = dataStream._meta;
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  const pkg = meta.package;
  if (!pkg || typeof pkg !== 'object' || !('name' in pkg)) {
    return undefined;
  }

  return typeof pkg.name === 'string' ? pkg.name : undefined;
}
