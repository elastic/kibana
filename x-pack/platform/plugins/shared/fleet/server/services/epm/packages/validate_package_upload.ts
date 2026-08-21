/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';

import { ElasticsearchAssetType } from '../../../../common';
import type { Installation } from '../../../../common';
import {
  getRegistryDataStreamAssetBaseName,
  isValidDataset,
  isValidDataStreamType,
} from '../../../../common/services';
import { PackageInvalidArchiveError, PackageNotFoundError } from '../../../errors';
import { appContextService } from '../../app_context';
import { getPathParts } from '../archive';
import { isTopLevelPipeline } from '../elasticsearch/ingest_pipeline/helpers';
import * as Registry from '../registry';

import { getPackageSavedObjects } from './get';

const UPLOAD_PACKAGE_NAME_MIN_LENGTH = 2;
const UPLOAD_PACKAGE_NAME_MAX_LENGTH = 150;
const UPLOAD_PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const DATA_STREAM_ILM_PATH = /\/data_stream\/[^/]+\/elasticsearch\/ilm\//;

interface UploadDataStream {
  dataset: string;
  type?: string;
  hidden?: boolean;
  elasticsearch?: {
    privileges?: { cluster?: string[] };
    dynamic_dataset?: boolean;
    dynamic_namespace?: boolean;
  };
}

interface UploadPolicyTemplate {
  dynamic_signal_types?: boolean;
  inputs?: Array<{ dynamic_signal_types?: boolean }>;
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

const FORBIDDEN_UPLOAD_DATA_STREAM_TYPES = new Set(['profiles']);

const FORBIDDEN_ARCHIVE_TYPES = new Set<string>([
  ElasticsearchAssetType.indexTemplate,
  ElasticsearchAssetType.componentTemplate,
  ElasticsearchAssetType.ilmPolicy,
  ElasticsearchAssetType.dataStreamIlmPolicy,
  ElasticsearchAssetType.esqlView,
  ElasticsearchAssetType.mlModel,
  ElasticsearchAssetType.transform,
]);

export async function validatePackageUpload({
  packageInfo,
  paths,
  installedPkg,
  savedObjectsClient,
}: {
  packageInfo: UploadPackageInfo;
  paths: string[];
  installedPkg?: SavedObject<Installation>;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<void> {
  assertValidUploadPackageName(packageInfo.name);
  assertNoForbiddenArchiveAssets(paths);
  assertNoWildcardAgentPermissions(packageInfo);
  assertNoClusterPrivileges(packageInfo);
  assertNoIndexPrivileges(packageInfo);
  assertNoDynamicIndexPatterns(packageInfo);
  assertValidUploadDataStreams(packageInfo.data_streams ?? []);
  assertDoesNotShadowInstalledPackage(packageInfo.name, installedPkg);
  await assertNotRegistryOrBundledName(packageInfo.name);
  // Residual: Kibana saved objects in the archive are still imported with overwrite: true.
  // Preflight only; an upload can race any first install (upload, registry, or setup).
  await assertNoOwnedDatasetCollision(packageInfo, savedObjectsClient);
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
    if (
      FORBIDDEN_ARCHIVE_TYPES.has(type) ||
      isTopLevelPipeline(path) ||
      DATA_STREAM_ILM_PATH.test(path)
    ) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.forbiddenArchiveAsset', {
          defaultMessage: 'Uploaded package contains a forbidden asset: {path}',
          values: { path },
        })
      );
    }
  }
}

function hasClusterPrivileges(cluster?: string[]): boolean {
  return Boolean(cluster && cluster.length > 0);
}

function assertNoWildcardAgentPermissions(packageInfo: UploadPackageInfo): void {
  if (packageInfo.type === 'input') {
    throw new PackageInvalidArchiveError(
      i18n.translate('xpack.fleet.packageUpload.inputPackageType', {
        defaultMessage: 'Uploaded packages cannot be input packages.',
      })
    );
  }

  for (const template of packageInfo.policy_templates ?? []) {
    if (template.dynamic_signal_types) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.dynamicSignalTypes', {
          defaultMessage: 'Uploaded packages cannot enable dynamic_signal_types.',
        })
      );
    }

    for (const input of template.inputs ?? []) {
      if (input.dynamic_signal_types) {
        throw new PackageInvalidArchiveError(
          i18n.translate('xpack.fleet.packageUpload.dynamicSignalTypes', {
            defaultMessage: 'Uploaded packages cannot enable dynamic_signal_types.',
          })
        );
      }
    }
  }
}

function assertNoIndexPrivileges(packageInfo: UploadPackageInfo): void {
  if (packageInfo.elasticsearch?.privileges?.indices?.length) {
    throw new PackageInvalidArchiveError(
      i18n.translate('xpack.fleet.packageUpload.indexPrivileges', {
        defaultMessage: 'Uploaded packages cannot request Elasticsearch index privileges.',
      })
    );
  }
}

function assertNoClusterPrivileges(packageInfo: UploadPackageInfo): void {
  if (hasClusterPrivileges(packageInfo.elasticsearch?.privileges?.cluster)) {
    throw new PackageInvalidArchiveError(
      i18n.translate('xpack.fleet.packageUpload.clusterPrivileges', {
        defaultMessage: 'Uploaded packages cannot request Elasticsearch cluster privileges.',
      })
    );
  }

  for (const dataStream of packageInfo.data_streams ?? []) {
    if (hasClusterPrivileges(dataStream.elasticsearch?.privileges?.cluster)) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.dataStreamClusterPrivileges', {
          defaultMessage:
            'Uploaded package dataset "{dataset}" cannot request Elasticsearch cluster privileges.',
          values: { dataset: dataStream.dataset },
        })
      );
    }
  }
}

function assertNoDynamicIndexPatterns(packageInfo: UploadPackageInfo): void {
  for (const dataStream of packageInfo.data_streams ?? []) {
    if (dataStream.elasticsearch?.dynamic_dataset || dataStream.elasticsearch?.dynamic_namespace) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.dynamicIndexPattern', {
          defaultMessage:
            'Uploaded package dataset "{dataset}" cannot enable dynamic_dataset or dynamic_namespace.',
          values: { dataset: dataStream.dataset },
        })
      );
    }
  }
}

function assertValidUploadDataStreams(dataStreams: UploadDataStream[]): void {
  for (const dataStream of dataStreams) {
    if (FORBIDDEN_UPLOAD_DATA_STREAM_TYPES.has(dataStream.type ?? '')) {
      throw new PackageInvalidArchiveError(
        i18n.translate('xpack.fleet.packageUpload.forbiddenDataStreamType', {
          defaultMessage: 'Uploaded packages cannot declare {type} data streams.',
          values: { type: dataStream.type ?? '' },
        })
      );
    }

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

function assertDoesNotShadowInstalledPackage(
  name: string,
  installedPkg?: SavedObject<Installation>
): void {
  if (!installedPkg) {
    return;
  }

  const installSource = installedPkg.attributes.install_source;
  if (installSource === 'upload') {
    return;
  }

  throw new PackageInvalidArchiveError(
    i18n.translate('xpack.fleet.packageUpload.registryPackageShadow', {
      defaultMessage:
        'Cannot upload a package that replaces the {installSource}-installed package "{name}".',
      values: { name, installSource: installSource || 'existing' },
    })
  );
}

async function assertNotRegistryOrBundledName(name: string): Promise<void> {
  if (appContextService.getConfig()?.internal?.allowRegistryPackageUploads) {
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
          'Could not verify that uploaded package name "{name}" is not a registry or bundled package.',
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
