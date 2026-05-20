import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { LogsSharedConfig } from '../common/plugin_config';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    savedObjects: import("@kbn/config-schema").ObjectType<{
        logView: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        }>;
    }>;
}>;
export declare const config: PluginConfigDescriptor<LogsSharedConfig>;
