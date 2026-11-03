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
import { parse } from 'yaml';

import { ElasticsearchAssetType } from '../../../../common';
import type { Installation } from '../../../../common';
import type { ArchiveIterator } from '../../../../common/types';
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
import { isRemoteIndexExpression } from '../elasticsearch/transform/ccs_transform_source';
import {
  getDestinationIndexAliases,
  isTransform,
} from '../elasticsearch/transform/transform_utils';
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
  use_otel_suffix?: boolean;
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
  archiveIterator,
  installedPkg,
  savedObjectsClient,
  esClient,
}: {
  packageInfo: UploadPackageInfo;
  paths: string[];
  archiveIterator: ArchiveIterator;
  installedPkg?: SavedObject<Installation>;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}): Promise<void> {
  // Test/development escape hatch (e.g. elastic-package stacks, FTR suites): skip
  // every upload validation so uploads behave as if this validator did not exist.
  if (appContextService.getConfig()?.internal?.skipUploadPackageValidation) {
    return;
  }

  // Subject to the escape hatch above, like every other check here. Registry-authored packages
  // legitimately source dot-prefixed indices — `ti_greynoise` and `ti_google_threat_intelligence`
  // read `.alerts-security.alerts-*` — and their maintainers upload those archives from
  // elastic-package stacks, which set this flag. Keeping the check unconditional would break
  // that workflow with no override. The control this check backstops, binding transform identity
  // to the installing user, has no escape hatch and holds on those stacks too; this is defense in
  // depth against a Fleet admin later re-binding a deferred transform through the reauthorize
  // flow, so a stack that has explicitly opted out of upload validation can opt out of it.
  await assertNoRestrictedTransformIndices(paths, archiveIterator);

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

/**
 * Reduce an index expression to the bare index/alias patterns so a prefix check cannot be
 * evaded. One expression can carry several comma-separated patterns; `-` marks an exclusion,
 * `<...>` wraps date math, and `<cluster>:<index>` targets a remote cluster — each can still
 * name a restricted index on this cluster. Whitespace is stripped after every prefix because
 * the prefix test only means something against a trimmed name.
 */
function normalizeIndexExpressions(expression: string): string[] {
  return expression
    .split(',')
    .map((pattern) => {
      let normalized = pattern.trim();
      while (normalized.startsWith('-')) {
        normalized = normalized.slice(1).trim();
      }
      if (isRemoteIndexExpression(normalized)) {
        normalized = normalized.slice(normalized.indexOf(':') + 1).trim();
      }
      if (normalized.startsWith('<')) {
        normalized = normalized.slice(1).trim();
      }
      return normalized;
    })
    .filter((pattern) => pattern.length > 0);
}

/**
 * Parse a transform spec every way the installer might. The yml install path parses with the
 * `yaml` package and the legacy path parses with `JSON.parse`, and the two disagree: `yaml`
 * rejects a duplicate map key that `JSON.parse` silently resolves to the last value. Screening
 * every result that parses means the validator can never see less than the installer will.
 *
 * Returns an empty array only when neither parser accepts the file, which the caller treats as
 * a rejection rather than a skip — the installer parses these same files unconditionally and
 * would throw on them anyway, and skipping is how a parser differential becomes a bypass.
 */
function parseTransformSpecs(buffer: Buffer): unknown[] {
  const raw = buffer.toString('utf-8');
  const parsed: unknown[] = [];

  try {
    parsed.push(parse(raw));
  } catch {
    // Not valid YAML; JSON.parse may still accept it.
  }

  try {
    parsed.push(JSON.parse(raw));
  } catch {
    // Not valid JSON; the YAML result above may still cover it.
  }

  return parsed;
}

function collectTransformIndexExpressions(content: unknown): string[] {
  if (!content || typeof content !== 'object') {
    return [];
  }

  const { source, dest } = content as {
    source?: { index?: unknown };
    dest?: { index?: unknown; aliases?: unknown };
  };

  const expressions: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.length > 0) {
      expressions.push(value);
    }
  };

  const sourceIndex = source?.index;
  if (Array.isArray(sourceIndex)) {
    sourceIndex.forEach(push);
  } else {
    push(sourceIndex);
  }

  push(dest?.index);

  // Resolve aliases with the installer's own helper rather than re-reading `dest.aliases` here.
  // It accepts three shapes — an array, a bare string, and an object keyed by alias name — and
  // screening only the array form would let `aliases: ".hidden"` or `aliases: { ".hidden": {} }`
  // through upload validation and still be installed as a dot-prefixed alias.
  getDestinationIndexAliases(dest?.aliases).forEach(({ alias }) => push(alias));

  return expressions;
}

/**
 * Uploaded packages must not ship transforms that read from or write to a system/restricted
 * index. Transforms are the one package asset that keeps executing against Elasticsearch after
 * installation, so a caller-authored transform pointed at `.fleet-policies` is a path to
 * disclosing and rewriting Agent policies in Spaces the uploader cannot reach. Transform
 * identity is separately bound to the installing user (see `install_source.ts`); this check
 * also stops such a transform from being installed in a deferred state and later started with
 * a Fleet admin's credentials through the reauthorize flow.
 *
 * Paths come from the same `isTransform` predicate the installer uses, so an archive cannot
 * place a transform where this check does not look but the installer still picks it up. Every
 * such file is parsed — including `manifest.yml` and `fields/*.yml` — and we key off the
 * presence of `source`/`dest` rather than the filename, which covers both the yml spec and the
 * legacy `*.json` spec without assuming a naming convention.
 */
async function assertNoRestrictedTransformIndices(
  paths: string[],
  archiveIterator: ArchiveIterator
): Promise<void> {
  const transformSpecPaths = paths.filter(isTransform);
  if (transformSpecPaths.length === 0) {
    return;
  }

  const transformSpecPathSet = new Set(transformSpecPaths);
  await archiveIterator.traverseEntries(
    async ({ path, buffer }) => {
      if (!buffer) {
        return;
      }

      const contents = parseTransformSpecs(buffer);
      if (contents.length === 0) {
        throw new PackageInvalidArchiveError(
          i18n.translate('xpack.fleet.packageUpload.unparsableTransformSpec', {
            defaultMessage:
              'Uploaded package contains a transform asset in "{path}" that could not be parsed as YAML or JSON.',
            values: { path },
          })
        );
      }

      for (const content of contents) {
        for (const expression of collectTransformIndexExpressions(content)) {
          if (normalizeIndexExpressions(expression).some((pattern) => pattern.startsWith('.'))) {
            throw new PackageInvalidArchiveError(
              i18n.translate('xpack.fleet.packageUpload.restrictedTransformIndex', {
                defaultMessage:
                  'Uploaded package contains a transform in "{path}" that targets the restricted index "{index}". Transforms in uploaded packages cannot read from or write to system indices.',
                values: { path, index: expression },
              })
            );
          }
        }
      }
    },
    (path) => transformSpecPathSet.has(path)
  );
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
      use_otel_suffix: dataStream.use_otel_suffix,
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
