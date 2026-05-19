import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV8110: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const migratePackagePolicyEvictionsFromV8110: SavedObjectModelVersionForwardCompatibilityFn;
