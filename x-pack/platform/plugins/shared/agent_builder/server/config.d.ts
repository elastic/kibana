import type { PluginConfigDescriptor } from '@kbn/core/server';
import { type TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    githubBaseUrl: import("@kbn/config-schema").Type<string>;
}>;
export type AgentBuilderConfig = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<AgentBuilderConfig>;
