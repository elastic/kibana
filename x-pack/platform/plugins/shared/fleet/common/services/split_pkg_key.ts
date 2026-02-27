/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverValid from 'semver/functions/valid';

/**
 * Extract the package name and package version from a string.
 *
 * @param pkgkey a string containing the package name delimited by the package version
 */
export function splitPkgKey(pkgkey: string): { pkgName: string; pkgVersion: string } {
  // If no version is provided, use the provided package key as the
  // package name and return an empty version value
  if (!pkgkey.includes('-')) {
    return { pkgName: pkgkey, pkgVersion: '' };
  }

  const pkgName = pkgkey.includes('-') ? pkgkey.substr(0, pkgkey.indexOf('-')) : pkgkey;

  if (pkgName === '') {
    throw new Error('Package key parsing failed: package name was empty');
  }

  // this will return the entire string if `indexOf` return -1
  const pkgVersion = pkgkey.substr(pkgkey.indexOf('-') + 1);
  if (!semverValid(pkgVersion)) {
    throw new Error('Package key parsing failed: package version was not a valid semver');
  }
  return { pkgName, pkgVersion };
}
