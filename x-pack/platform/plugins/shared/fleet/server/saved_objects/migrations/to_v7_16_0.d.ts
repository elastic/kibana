import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { Installation, PackagePolicy } from '../../../common';
export declare const migrateInstallationToV7160: SavedObjectMigrationFn<Installation, Installation>;
export declare const migratePackagePolicyToV7160: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
