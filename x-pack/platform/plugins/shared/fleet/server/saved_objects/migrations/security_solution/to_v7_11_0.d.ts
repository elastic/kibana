import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV7110: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
