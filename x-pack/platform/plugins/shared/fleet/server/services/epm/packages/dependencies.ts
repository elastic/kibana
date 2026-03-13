/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageDependencies } from '../../../../common/types';

import type { InstallablePackage } from '../../../../common';

import { appContextService } from '../../app_context';

export function getPackageDependencies(
  packageInfo: InstallablePackage
): PackageDependencies | null {
  const enableResolveDependencies =
    appContextService.getExperimentalFeatures().enableResolveDependencies;

  if (!enableResolveDependencies) {
    return null;
  }

  const dependencies =
    packageInfo.requires?.content?.map((pkg) => ({
      name: pkg.package,
      version: pkg.version,
    })) ?? null;
  return dependencies;
}
