import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV820: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
