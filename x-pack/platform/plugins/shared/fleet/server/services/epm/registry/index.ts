/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import mime from 'mime-types';
import semverGte from 'semver/functions/gte';

import type { Response } from 'node-fetch';
import type { Logger } from '@kbn/logging';

import type { ExtractedIntegrationFields } from '@kbn/fields-metadata-plugin/server';

import { splitPkgKey as split } from '../../../../common/services';

import { KibanaAssetType } from '../../../types';
import type {
  AssetsGroupedByServiceByType,
  CategorySummaryList,
  RegistryPackage,
  RegistrySearchResults,
  GetCategoriesRequest,
  GetPackagesRequest,
  PackageVerificationResult,
  ArchivePackage,
  BundledPackage,
  AssetsMap,
} from '../../../types';
import {
  getPathParts,
  setVerificationResult,
  getPackageInfo,
  setPackageInfo,
  generatePackageInfoFromArchiveBuffer,
  unpackBufferToAssetsMap,
  getVerificationResult,
} from '../archive';
import { streamToBuffer, streamToString } from '../streams';
import { appContextService } from '../..';
import {
  PackageNotFoundError,
  RegistryResponseError,
  PackageFailedVerificationError,
  PackageUnsupportedMediaTypeError,
  ArchiveNotFoundError,
} from '../../../errors';

import { getBundledPackageByName } from '../packages/bundled_packages';

import { resolveDataStreamFields, resolveDataStreamsMap, withPackageSpan } from '../packages/utils';

import { verifyPackageArchiveSignature } from '../packages/package_verification';

import type { ArchiveIterator } from '../../../../common/types';

import { airGappedUtils } from '../airgapped';

import { fetchUrl, getResponse, getResponseStreamWithSize } from './requests';
import { getRegistryUrl } from './registry_url';

export const splitPkgKey = split;

export const pkgToPkgKey = ({ name, version }: { name: string; version: string }) =>
  `${name}-${version}`;

export async function fetchList(
  params?: GetPackagesRequest['query']
): Promise<RegistrySearchResults> {
  if (airGappedUtils().shouldSkipRegistryRequests) {
    appContextService
      .getLogger()
      .debug(
        'fetchList: isAirGapped enabled and no registryUrl or RegistryProxyUrl configured, skipping registry requests'
      );
    return [];
  }

  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/search`);
  if (params) {
    if (params.category) {
      url.searchParams.set('category', params.category);
    }
    if (params.prerelease) {
      url.searchParams.set('prerelease', params.prerelease.toString());
    }
  }

  setConstraints(url);

  return fetchUrl(url.toString()).then(JSON.parse);
}

export interface FetchFindLatestPackageOptions {
  ignoreConstraints?: boolean;
  prerelease?: boolean;
}

async function _fetchFindLatestPackage(
  packageName: string,
  options?: FetchFindLatestPackageOptions
): Promise<RegistryPackage | BundledPackage | null> {
  return withPackageSpan(`Find latest package ${packageName}`, async () => {
    const logger = appContextService.getLogger();
    const { ignoreConstraints = false, prerelease = false } = options ?? {};

    const bundledPackage = await getBundledPackageByName(packageName);

    const registryUrl = getRegistryUrl();
    const url = new URL(`${registryUrl}/search?package=${packageName}&prerelease=${prerelease}`);

    if (!ignoreConstraints) {
      setConstraints(url);
    }

    try {
      if (!airGappedUtils().shouldSkipRegistryRequests) {
        const res = await fetchUrl(url.toString(), 1);
        const searchResults: RegistryPackage[] = JSON.parse(res);

        const latestPackageFromRegistry = searchResults[0] ?? null;

        if (
          bundledPackage &&
          semverGte(bundledPackage.version, latestPackageFromRegistry.version)
        ) {
          return bundledPackage;
        }
        return latestPackageFromRegistry;
      } else if (airGappedUtils().shouldSkipRegistryRequests && bundledPackage) {
        return bundledPackage;
      } else {
        return null;
      }
    } catch (error) {
      logger.error(
        `Failed to fetch latest version of ${packageName} from registry: ${error.message}`
      );

      // Fall back to the bundled version of the package if it exists
      if (bundledPackage) {
        return bundledPackage;
      }

      // Otherwise, return null and allow callers to determine whether they'll consider this an error or not
      return null;
    }
  });
}

export async function fetchFindLatestPackageOrThrow(
  packageName: string,
  options?: FetchFindLatestPackageOptions
) {
  const latestPackage = await _fetchFindLatestPackage(packageName, options);

  if (!latestPackage) {
    throw new PackageNotFoundError(`[${packageName}] package not found in registry`);
  }

  return latestPackage;
}

export async function fetchFindLatestPackageOrUndefined(
  packageName: string,
  options?: FetchFindLatestPackageOptions
) {
  const logger = appContextService.getLogger();

  try {
    const latestPackage = await _fetchFindLatestPackage(packageName, options);

    if (!latestPackage) {
      return undefined;
    }
    return latestPackage;
  } catch (error) {
    logger.warn(`Error fetching latest package for ${packageName}: ${error.message}`);
    return undefined;
  }
}

export async function fetchInfo(
  pkgName: string,
  pkgVersion: string
): Promise<RegistryPackage | ArchivePackage> {
  const registryUrl = getRegistryUrl();
  // if isAirGapped config enabled and bundled package, use the bundled version
  if (airGappedUtils().shouldSkipRegistryRequests) {
    const archivePackage = await getBundledArchive(pkgName, pkgVersion);
    if (archivePackage) {
      return archivePackage.packageInfo;
    }
  }
  try {
    // Trailing slash avoids 301 redirect / extra hop
    const res = await fetchUrl(`${registryUrl}/package/${pkgName}/${pkgVersion}/`).then(JSON.parse);

    return res;
  } catch (err) {
    if (err instanceof RegistryResponseError && err.status === 404) {
      const archivePackage = await getBundledArchive(pkgName, pkgVersion);
      if (archivePackage) {
        return archivePackage.packageInfo;
      }
      throw new PackageNotFoundError(`${pkgName}@${pkgVersion} not found`);
    }
    throw err;
  }
}

export async function getBundledArchive(
  pkgName: string,
  pkgVersion: string
): Promise<{ paths: string[]; packageInfo: ArchivePackage } | undefined> {
  // Check bundled packages in case the exact package being requested is available on disk
  const bundledPackage = await getBundledPackageByName(pkgName);

  if (bundledPackage && bundledPackage.version === pkgVersion) {
    const archiveBuffer = await bundledPackage.getBuffer();
    const archivePackage = await generatePackageInfoFromArchiveBuffer(
      archiveBuffer,
      'application/zip'
    );

    return archivePackage;
  }
}

export async function getFile(
  pkgName: string,
  pkgVersion: string,
  relPath: string
): Promise<Response | null> {
  const filePath = `/package/${pkgName}/${pkgVersion}/${relPath}`;
  return fetchFile(filePath);
}

export async function fetchFile(filePath: string): Promise<Response | null> {
  if (airGappedUtils().shouldSkipRegistryRequests) {
    appContextService
      .getLogger()
      .debug(
        'fetchFile: isAirGapped enabled and no registryUrl or RegistryProxyUrl configured, skipping registry requests'
      );
    return null;
  }
  const registryUrl = getRegistryUrl();
  return getResponse(`${registryUrl}${filePath}`);
}

function setKibanaVersion(url: URL) {
  const config = appContextService.getConfig();

  const disableVersionCheck =
    (config?.developer?.disableRegistryVersionCheck ?? false) ||
    config?.internal?.registry?.kibanaVersionCheckEnabled === false;

  if (disableVersionCheck) {
    return;
  }

  const kibanaVersion = appContextService.getKibanaVersion().split('-')[0]; // may be x.y.z-SNAPSHOT

  if (kibanaVersion) {
    url.searchParams.set('kibana.version', kibanaVersion);
  }
}

function setSpecVersion(url: URL) {
  const specMin = appContextService.getConfig()?.internal?.registry?.spec?.min;
  const specMax = appContextService.getConfig()?.internal?.registry?.spec?.max;

  if (specMin) {
    url.searchParams.set('spec.min', specMin);
  }
  if (specMax) {
    url.searchParams.set('spec.max', specMax);
  }
}

function setCapabilities(url: URL) {
  const capabilities = appContextService.getConfig()?.internal?.registry?.capabilities;
  if (capabilities && capabilities.length > 0) {
    url.searchParams.set('capabilities', capabilities.join(','));
  }
}

function setConstraints(url: URL) {
  setKibanaVersion(url);
  setCapabilities(url);
  setSpecVersion(url);
}

export async function fetchCategories(
  params?: GetCategoriesRequest['query']
): Promise<CategorySummaryList> {
  if (airGappedUtils().shouldSkipRegistryRequests) {
    appContextService
      .getLogger()
      .debug(
        'fetchCategories: isAirGapped enabled and no registryUrl or RegistryProxyUrl configured, skipping registry requests'
      );
    return [];
  }

  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/categories`);
  if (params) {
    if (params.prerelease) {
      url.searchParams.set('prerelease', params.prerelease.toString());
    }
    if (params.include_policy_templates) {
      url.searchParams.set('include_policy_templates', params.include_policy_templates.toString());
    }
  }

  setConstraints(url);

  return fetchUrl(url.toString()).then(JSON.parse);
}

export async function getInfo(name: string, version: string) {
  return withPackageSpan('Fetch package info', async () => {
    const packageInfo = await fetchInfo(name, version);
    return packageInfo as RegistryPackage;
  });
}

// Check that the packageInfo exists in cache
// If not, retrieve it from the archive
async function getPackageInfoFromArchiveOrCache(
  name: string,
  version: string,
  archiveBuffer: Buffer,
  archivePath: string
): Promise<ArchivePackage> {
  const cachedInfo = getPackageInfo({ name, version });
  if (!cachedInfo) {
    const { packageInfo } = await generatePackageInfoFromArchiveBuffer(
      archiveBuffer,
      ensureContentType(archivePath)
    );
    setPackageInfo({ packageInfo, name, version });
    return packageInfo;
  } else {
    return cachedInfo;
  }
}

export async function getPackage(
  name: string,
  version: string,
  options?: { ignoreUnverified?: boolean; useStreaming?: boolean }
): Promise<{
  paths: string[];
  packageInfo: ArchivePackage;
  assetsMap: AssetsMap;
  archiveIterator: ArchiveIterator;
  verificationResult?: PackageVerificationResult;
}> {
  const logger = appContextService.getLogger();
  let packageInfo: ArchivePackage | undefined = getPackageInfo({ name, version });
  let verificationResult: PackageVerificationResult | undefined = getVerificationResult({
    name,
    version,
  });
  try {
    const {
      archiveBuffer,
      archivePath,
      verificationResult: latestVerificationResult,
    } = await withPackageSpan('Fetch package archive from archive buffer', () =>
      fetchArchiveBuffer({
        pkgName: name,
        pkgVersion: version,
        shouldVerify: true,
        ignoreUnverified: options?.ignoreUnverified,
      })
    );

    if (latestVerificationResult) {
      verificationResult = latestVerificationResult;
      setVerificationResult({ name, version }, latestVerificationResult);
    }

    const contentType = ensureContentType(archivePath);
    const { paths, assetsMap, archiveIterator } = await unpackBufferToAssetsMap({
      archiveBuffer,
      contentType,
      useStreaming: options?.useStreaming,
    });

    if (!packageInfo) {
      packageInfo = await getPackageInfoFromArchiveOrCache(
        name,
        version,
        archiveBuffer,
        archivePath
      );
    }

    return { paths, packageInfo, assetsMap, archiveIterator, verificationResult };
  } catch (error) {
    logger.warn(`getPackage failed with error: ${error}`);
    throw error;
  }
}

export async function getPackageFieldsMetadata(
  params: { packageName: string; datasetName?: string },
  options: { excludedFieldsAssets?: string[] } = {}
): Promise<ExtractedIntegrationFields> {
  const { packageName, datasetName } = params;
  const { excludedFieldsAssets = ['ecs.yml'] } = options;

  // Attempt retrieving latest package name and version
  const latestPackage = await fetchFindLatestPackageOrThrow(packageName);
  const { name, version } = latestPackage;
  try {
    // Attempt retrieving latest package
    const resolvedPackage = await getPackage(name, version);

    // We need to collect all the available data streams for the package.
    // In case a dataset is specified from the parameter, it will load the fields only for that specific dataset.
    // As a fallback case, we'll try to read the fields for all the data streams in the package.
    const dataStreamsMap = resolveDataStreamsMap(resolvedPackage.packageInfo.data_streams);

    const assetsMap = resolvedPackage.assetsMap;

    const dataStream = datasetName ? dataStreamsMap.get(datasetName) : null;

    if (dataStream) {
      // Resolve a single data stream fields when the `datasetName` parameter is specified
      return resolveDataStreamFields({ dataStream, assetsMap, excludedFieldsAssets });
    } else {
      // Resolve and merge all the integration data streams fields otherwise
      return [...dataStreamsMap.values()].reduce(
        (packageDataStreamsFields, currentDataStream) =>
          Object.assign(
            packageDataStreamsFields,
            resolveDataStreamFields({
              dataStream: currentDataStream,
              assetsMap,
              excludedFieldsAssets,
            })
          ),
        {}
      );
    }
  } catch (error) {
    appContextService.getLogger().warn(`getPackageFieldsMetadata error: ${error}`);
    throw error;
  }
}

export function ensureContentType(archivePath: string) {
  const contentType = mime.lookup(archivePath);

  if (!contentType) {
    throw new PackageUnsupportedMediaTypeError(
      `Unknown compression format for '${archivePath}'. Please use .zip or .gz`
    );
  }
  return contentType;
}

export async function fetchArchiveBuffer({
  pkgName,
  pkgVersion,
  shouldVerify,
  ignoreUnverified = false,
}: {
  pkgName: string;
  pkgVersion: string;
  shouldVerify: boolean;
  ignoreUnverified?: boolean;
}): Promise<{
  archiveBuffer: Buffer;
  archivePath: string;
  verificationResult?: PackageVerificationResult;
}> {
  const logger = appContextService.getLogger();
  let { download: archivePath } = await getInfo(pkgName, pkgVersion);

  // Bundled packages don't have a download path when they're installed, as they're
  // ArchivePackage objects - so we fake the download path here instead
  if (!archivePath) {
    archivePath = `/epr/${pkgName}/${pkgName}-${pkgVersion}.zip`;
  }
  const registryUrl = getRegistryUrl();
  const archiveUrl = `${registryUrl}${archivePath}`;
  try {
    const archiveBuffer = await getResponseStreamWithSize(archiveUrl).then(({ stream, size }) =>
      streamToBuffer(stream, size)
    );
    if (!archiveBuffer) {
      logger.warn(`Archive Buffer not found`);
      throw new ArchiveNotFoundError('Archive Buffer not found');
    }

    if (shouldVerify) {
      const verificationResult = await verifyPackageArchiveSignature({
        pkgName,
        pkgVersion,
        pkgArchiveBuffer: archiveBuffer,
        logger,
      });

      if (verificationResult.verificationStatus === 'unverified' && !ignoreUnverified) {
        throw new PackageFailedVerificationError(pkgName, pkgVersion);
      }
      return { archiveBuffer, archivePath, verificationResult };
    }
    return { archiveBuffer, archivePath };
  } catch (error) {
    logger.warn(`fetchArchiveBuffer failed with error: ${error}`);
    throw error;
  }
}

export async function getPackageArchiveSignatureOrUndefined({
  pkgName,
  pkgVersion,
  logger,
}: {
  pkgName: string;
  pkgVersion: string;
  logger: Logger;
}): Promise<string | undefined> {
  const { signature_path: signaturePath } = await getInfo(pkgName, pkgVersion);

  if (!signaturePath) {
    logger.debug(
      `Package ${pkgName}-${pkgVersion} does not have a signature_path, verification will not be possible.`
    );
    return undefined;
  }

  try {
    const res = await fetchFile(signaturePath);

    if (res?.body) return streamToString(res.body);
    return undefined;
  } catch (e) {
    logger.error(`Error retrieving package signature at '${signaturePath}' : ${e}`);
    return undefined;
  }
}

export function groupPathsByService(paths: string[]): AssetsGroupedByServiceByType {
  const kibanaAssetTypes = Object.values<string>(KibanaAssetType);

  // ASK: best way, if any, to avoid `any`?
  const assets = paths.reduce((map: any, path) => {
    const parts = getPathParts(path.replace(/^\/package\//, ''));
    if (
      (parts.service === 'kibana' && kibanaAssetTypes.includes(parts.type)) ||
      parts.service === 'elasticsearch'
    ) {
      if (!map[parts.service]) map[parts.service] = {};
      if (!map[parts.service][parts.type]) map[parts.service][parts.type] = [];
      map[parts.service][parts.type].push(parts);
    }

    return map;
  }, {});

  return {
    kibana: assets.kibana,
    elasticsearch: assets.elasticsearch,
  };
}

export function getNoticePath(paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = getPathParts(path.replace(/^\/package\//, ''));
    if (parts.type === 'notice') {
      const { pkgName, pkgVersion } = splitPkgKey(parts.pkgkey);
      return `/package/${pkgName}/${pkgVersion}/${parts.file}`;
    }
  }

  return undefined;
}

export function getLicensePath(paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = getPathParts(path.replace(/^\/package\//, ''));
    if (parts.type === 'license') {
      const { pkgName, pkgVersion } = splitPkgKey(parts.pkgkey);
      return `/package/${pkgName}/${pkgVersion}/${parts.file}`;
    }
  }

  return undefined;
}
