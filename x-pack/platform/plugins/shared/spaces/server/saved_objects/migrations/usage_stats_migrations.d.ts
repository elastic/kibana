import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { UsageStats } from '../../usage_stats';
export declare const migrateTo7141: (doc: SavedObjectUnsanitizedDoc<UsageStats>) => SavedObjectUnsanitizedDoc<UsageStats>;
