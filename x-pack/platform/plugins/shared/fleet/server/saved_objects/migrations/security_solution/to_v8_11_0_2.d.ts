import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV81102: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const migratePackagePolicyEvictionsFromV81102: SavedObjectModelVersionForwardCompatibilityFn;
