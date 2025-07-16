/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetErrorResponse } from '../../common';

import type { PackageInfo, PackageListItem } from '../types';

import type { RequestError } from '../hooks';

export function isPackageUnverified(
  pkg: PackageInfo | PackageListItem,
  packageVerificationKeyId?: string
) {
  if (!('installationInfo' in pkg) || !pkg.installationInfo) return false;

  console.log(pkg.name, 'packageVerificationKeyId', packageVerificationKeyId);

  const { verification_status: verificationStatus, verification_key_id: verificationKeyId } =
    pkg?.installationInfo;

  console.log(pkg.name, 'installationInfo', pkg.installationInfo);

  const isKeyOutdated = !!verificationKeyId && verificationKeyId !== packageVerificationKeyId;

  console.log(pkg.name, 'isKeyOutdated', isKeyOutdated);

  const isUnverified =
    verificationStatus === 'unverified' || (verificationStatus === 'verified' && isKeyOutdated);

  console.log(pkg.name, 'isPackageUnverified', isUnverified);
  return isUnverified;
}

export const isVerificationError = (err?: FleetErrorResponse | RequestError) =>
  err && 'attributes' in err && err.attributes?.type === 'verification_failed';
