import type { PluginConfigDescriptor } from '@kbn/core/server';
import { type TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
}>;
export type InboxConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<InboxConfig>;
