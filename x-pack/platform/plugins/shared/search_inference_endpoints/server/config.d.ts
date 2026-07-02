import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export * from './types';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    ui: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    dynamicConnectors: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        pollingIntervalMins: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export type SearchInferenceEndpointsConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<SearchInferenceEndpointsConfig>;
