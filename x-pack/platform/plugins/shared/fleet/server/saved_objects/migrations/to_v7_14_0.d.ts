import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy, Installation } from '../../../common';
export declare const migratePackagePolicyToV7140: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
export declare const migrateInstallationToV7140: SavedObjectMigrationFn<Installation, Installation>;
