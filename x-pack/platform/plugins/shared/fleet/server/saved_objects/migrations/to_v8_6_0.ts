/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { Settings } from '../../../common/types';

import type { Installation } from '../../../common';
import { FLEET_CLOUD_SECURITY_POSTURE_PACKAGE } from '../../../common/constants';
import type { PackagePolicy } from '../../../common';

import { migratePackagePolicyToV860 as SecSolMigratePackagePolicyToV860 } from './security_solution';

export const migrateSettingsToV860: SavedObjectMigrationFn<Settings, Settings> = (
  settingsDoc,
  migrationContext
) => {
  // @ts-expect-error has_seen_fleet_migration_notice property does not exists anymore
  delete settingsDoc.attributes.has_seen_fleet_migration_notice;

  settingsDoc.attributes.prerelease_integrations_enabled = false;

  return settingsDoc;
};

export const migrateInstallationToV860: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc
) => {
  if (installationDoc.attributes.name === FLEET_CLOUD_SECURITY_POSTURE_PACKAGE) {
    installationDoc.attributes.keep_policies_up_to_date = true;
  }
  return installationDoc;
};

export const migratePackagePolicyToV860: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV860(packagePolicyDoc, migrationContext);
  }

  return updatedPackagePolicyDoc;
};
