/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { PackagePolicy } from '../../../common';

import { migratePackagePolicyToV880 as SecSolMigratePackagePolicyToV880 } from './security_solution';
import { migratePackagePolicyToV880 as SyntheticsMigratePackagePolicyToV880 } from './synthetics';

export const migratePackagePolicyToV880: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV880(packagePolicyDoc, migrationContext);
  }

  // Synthetics specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'synthetics') {
    updatedPackagePolicyDoc = SyntheticsMigratePackagePolicyToV880(
      packagePolicyDoc,
      migrationContext
    );
  }

  return updatedPackagePolicyDoc;
};
