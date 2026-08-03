import type { TypeOf } from '@kbn/config-schema';
import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema } from './config';
export type { MonitoringCollectionConfig } from './config';
export type { MonitoringCollectionSetup, MetricResult, Metric } from './plugin';
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").MonitoringCollectionPlugin>;
export declare const config: PluginConfigDescriptor<TypeOf<typeof configSchema>>;
