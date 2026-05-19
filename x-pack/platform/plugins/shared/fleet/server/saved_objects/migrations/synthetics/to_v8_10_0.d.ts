import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy, PackagePolicyConfigRecord } from '../../../../common';
export declare const migrateSyntheticsPackagePolicyToV8100: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const processorsFormatter: (vars: PackagePolicyConfigRecord) => string;
