import { type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{}>;
export declare const config: PluginConfigDescriptor<LlmTasksConfig>;
export type LlmTasksConfig = TypeOf<typeof configSchema>;
export {};
