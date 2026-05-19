import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export declare const config: PluginConfigDescriptor;
export type FleetConfigType = TypeOf<typeof config.schema>;
