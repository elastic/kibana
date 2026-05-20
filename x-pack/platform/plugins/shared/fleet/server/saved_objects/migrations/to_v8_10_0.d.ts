import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';
import type { Output } from '../../../common';
export declare const migrateOutputToV8100: SavedObjectModelDataBackfillFn<Output, Output>;
export declare const migrateOutputEvictionsFromV8100: SavedObjectModelVersionForwardCompatibilityFn;
