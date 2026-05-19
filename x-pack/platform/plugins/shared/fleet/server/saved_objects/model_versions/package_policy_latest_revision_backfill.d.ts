import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { PackagePolicy } from '../../../common';
export declare const backfillPackagePolicyLatestRevision: SavedObjectModelDataBackfillFn<PackagePolicy & {
    latest_revision?: boolean;
}, PackagePolicy & {
    latest_revision?: boolean;
}>;
