import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    search_timeout: import("@kbn/config-schema").Type<import("moment").Duration>;
}>;
export type GlobalSearchConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<GlobalSearchConfigType>;
export {};
