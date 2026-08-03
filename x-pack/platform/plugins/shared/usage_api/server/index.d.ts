import type { PluginInitializerContext } from '@kbn/core/server';
export type { UsageApiSetup, UsageApiStart } from './plugin';
export type { UsageReportingService, UsageRecord, UsageMetrics, UsageSource, } from './usage_reporting';
export { config } from './config';
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").UsageApiPlugin>;
