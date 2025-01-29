/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import path from 'path';

import { once } from 'lodash';

import type { BundledPackage, Installation } from '../../../types';
import { BundledPackageLocationNotFoundError } from '../../../errors';
import { appContextService } from '../../app_context';
import { splitPkgKey, pkgToPkgKey } from '../registry';

let CACHE_BUNDLED_PACKAGES: BundledPackage[] | undefined;

export function _purgeBundledPackagesCache() {
  CACHE_BUNDLED_PACKAGES = undefined;
}

function bundledPackagesFromCache() {
  if (!CACHE_BUNDLED_PACKAGES) {
    throw new Error('CACHE_BUNDLED_PACKAGES is not populated');
  }

  return CACHE_BUNDLED_PACKAGES.map(({ name, version, getBuffer }) => ({
    name,
    version,
    getBuffer: once(getBuffer),
  }));
}

export async function getBundledPackages(): Promise<BundledPackage[]> {
  const config = appContextService.getConfig();
  if (config?.developer?.disableBundledPackagesCache !== true && CACHE_BUNDLED_PACKAGES) {
    return bundledPackagesFromCache();
  }

  const bundledPackageLocation = config?.developer?.bundledPackageLocation;

  if (!bundledPackageLocation) {
    throw new BundledPackageLocationNotFoundError(
      'xpack.fleet.developer.bundledPackageLocation is not configured'
    );
  }

  // If the bundled package directory is missing, we log a warning during setup,
  // so we can safely ignore this case here and just retun and empty array
  try {
    await fs.stat(bundledPackageLocation);
  } catch (error) {
    return [];
  }

  try {
    const dirContents = await fs.readdir(bundledPackageLocation);
    const zipFiles = dirContents.filter((file) => file.endsWith('.zip'));

    const result = await Promise.all(
      zipFiles.map(async (zipFile) => {
        const { pkgName, pkgVersion } = splitPkgKey(zipFile.replace(/\.zip$/, ''));

        const getBuffer = () => fs.readFile(path.join(bundledPackageLocation, zipFile));

        return {
          name: pkgName,
          version: pkgVersion,
          getBuffer,
        };
      })
    );

    CACHE_BUNDLED_PACKAGES = result;

    return bundledPackagesFromCache();
  } catch (err) {
    const logger = appContextService.getLogger();
    logger.warn(`Unable to read bundled packages from ${bundledPackageLocation}`);

    return [];
  }
}

export async function getBundledPackageForInstallation(
  installation: Installation
): Promise<BundledPackage | undefined> {
  const bundledPackages = await getBundledPackages();

  return bundledPackages.find(
    (bundledPkg: BundledPackage) =>
      bundledPkg.name === installation.name && bundledPkg.version === installation.version
  );
}

export async function getBundledPackageByPkgKey(
  pkgKey: string
): Promise<BundledPackage | undefined> {
  const bundledPackages = await getBundledPackages();

  return bundledPackages.find((pkg) => {
    if (pkgKey.includes('-')) {
      return pkgToPkgKey(pkg) === pkgKey;
    } else {
      return pkg.name === pkgKey;
    }
  });
}

export async function getBundledPackageByName(name: string): Promise<BundledPackage | undefined> {
  const bundledPackages = await getBundledPackages();

  return bundledPackages.find((pkg) => pkg.name === name);
}
