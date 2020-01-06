/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * on the license information extracted from the xPackInfo.
 * @param {XPackInfo} xPackInfo XPackInfo instance to extract license information from.
 * @returns {LicenseCheckResult}
 */
export function checkLicense(xPackInfo) {
  if (!xPackInfo.isAvailable()) {
    return {
      maps: false,
    };
  }

  const isAnyXpackLicense = xPackInfo.license.isOneOf([
    'basic',
    'standard',
    'gold',
    'platinum',
    'enterprise',
    'trial',
  ]);

  if (!isAnyXpackLicense) {
    return {
      maps: false,
    };
  }

  return {
    maps: true,
    uid: xPackInfo.license.getUid(),
  };
}
