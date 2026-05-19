import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../common';
export declare const migratePackagePolicySetRequiresRootToV8150: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const migratePackagePolicyIdsToV8150: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
