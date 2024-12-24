/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { PackagePolicy } from '../../../common';
import type { Installation } from '../../../common';

import { migratePackagePolicyToV830 as SecSolMigratePackagePolicyToV830 } from './security_solution';

export const migrateInstallationToV830: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc,
  migrationContext
) => {
  delete installationDoc.attributes.removable;

  return installationDoc;
};

export const migratePackagePolicyToV830: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV830(packagePolicyDoc, migrationContext);
  }

  return updatedPackagePolicyDoc;
};
