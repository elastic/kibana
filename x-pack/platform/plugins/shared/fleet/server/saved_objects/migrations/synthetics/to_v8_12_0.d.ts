import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../../common';
export declare const migrateSyntheticsPackagePolicyToV8120: SavedObjectModelDataBackfillFn<PackagePolicy, PackagePolicy>;
export declare const processorsFormatter: (processorsStr: string, namespace?: string) => string;
