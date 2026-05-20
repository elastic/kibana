import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../../common';
export declare const migrateCspPackagePolicyToV8110: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
