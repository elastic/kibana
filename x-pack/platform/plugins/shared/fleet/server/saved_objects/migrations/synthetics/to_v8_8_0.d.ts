import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../../common';
export declare const ALLOWED_SCHEDULES_IN_MINUTES: string[];
export declare const migratePackagePolicyToV880: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
