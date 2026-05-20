import type { PluginInitializerContext } from '@kbn/core/server';
import type { ReportingConfigType } from '@kbn/reporting-server';
export { config } from './config';
/**
 * Common types that are documented in the Public API
 */
export type { ReportingSetup, ReportingStart } from './types';
export declare const plugin: (initContext: PluginInitializerContext<ReportingConfigType>) => Promise<import("./plugin").ReportingPlugin>;
export { ReportingCore } from './core';
