import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    cache_refresh_interval: import("@kbn/config-schema").Type<import("moment").Duration>;
}>;
export type SavedObjectsTaggingConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<SavedObjectsTaggingConfigType>;
export {};
