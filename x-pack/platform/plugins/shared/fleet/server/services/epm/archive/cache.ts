/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArchivePackage, RegistryPackage, PackageVerificationResult } from '../../../types';
import { appContextService } from '../..';

type SharedKeyString = string;

const sharedKey = ({ name, version }: SharedKey): SharedKeyString => `${name}-${version}`;

const verificationResultCache: Map<SharedKeyString, PackageVerificationResult> = new Map();
export const getVerificationResult = (key: SharedKey) =>
  verificationResultCache.get(sharedKey(key));
export const setVerificationResult = (key: SharedKey, value: PackageVerificationResult) =>
  verificationResultCache.set(sharedKey(key), value);
export const hasVerificationResult = (key: SharedKey) =>
  verificationResultCache.has(sharedKey(key));
export const clearVerificationResults = () => verificationResultCache.clear();
export const deleteVerificationResult = (key: SharedKey) =>
  verificationResultCache.delete(sharedKey(key));

export interface SharedKey {
  name: string;
  version: string;
}

const packageInfoCache: Map<SharedKeyString, ArchivePackage | RegistryPackage> = new Map();

export const getPackageInfo = (args: SharedKey) => {
  return packageInfoCache.get(sharedKey(args));
};

/*
 * This cache should only be used to store "full" package info generated from the package archive.
 * NOT package info from the EPR API. This is because we parse extra fields from the archive
 * which are not provided by the registry API.
 */
export const setPackageInfo = ({
  name,
  version,
  packageInfo,
}: SharedKey & { packageInfo: ArchivePackage | RegistryPackage }) => {
  const logger = appContextService.getLogger();
  const key = sharedKey({ name, version });
  logger.debug(`Setting package info to the cache for ${name}-${version}`);
  logger.trace(JSON.stringify(packageInfo));
  return packageInfoCache.set(key, packageInfo);
};

export const deletePackageInfo = (args: SharedKey) => packageInfoCache.delete(sharedKey(args));
