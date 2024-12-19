/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { FleetUnauthorizedError } from '../errors';

export function checkAllowedPackages<T>(
  packages: T[],
  allowedPackages?: string[],
  keyPath: string = ''
) {
  // allowedPackages is undefined when user has privileges from fleet
  if (!packages.length || !allowedPackages) {
    return;
  }

  if (!allowedPackages.length) {
    throw new FleetUnauthorizedError(
      'Authorization denied due to lack of integration package privileges'
    );
  }

  const allowedPackagedSet = new Set(allowedPackages);
  const allowedPackagesStr = allowedPackages.join(', ');

  packages.some((pkg) => {
    const pkgName = typeof pkg === 'string' ? pkg : get(pkg, keyPath, undefined);
    if (!pkgName) {
      throw new FleetUnauthorizedError(
        `Authorization denied. Allowed package(s): ${allowedPackagesStr}.`
      );
    }

    const isRestricted = !allowedPackagedSet.has(pkgName);
    if (isRestricted) {
      throw new FleetUnauthorizedError(
        `Authorization denied to package: ${pkgName}. Allowed package(s): ${allowedPackagesStr}`
      );
    }

    return false;
  });
}
