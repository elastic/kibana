import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../../common';
export declare const migratePackagePolicyToV8140: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const migratePackagePolicyEnableCapsToV8140: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const migratePackagePolicyAddAntivirusRegistrationModeToV8140: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
