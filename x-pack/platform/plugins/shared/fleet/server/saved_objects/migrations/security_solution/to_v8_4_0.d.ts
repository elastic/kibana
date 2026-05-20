import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV840: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
