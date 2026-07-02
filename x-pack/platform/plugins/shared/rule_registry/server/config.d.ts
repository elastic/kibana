import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export declare const config: PluginConfigDescriptor;
export type RuleRegistryPluginConfig = TypeOf<typeof config.schema>;
export declare const INDEX_PREFIX: ".alerts";
