import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../common';
import type { Installation } from '../../../common';
export declare const migrateInstallationToV830: SavedObjectMigrationFn<Installation, Installation>;
export declare const migratePackagePolicyToV830: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
