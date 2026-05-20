import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV8100: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const migratePackagePolicyEvictionsFromV8100: SavedObjectModelVersionForwardCompatibilityFn;
