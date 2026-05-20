import type { PluginInitializerContext } from '@kbn/core/server';
import type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart } from './plugin';
export type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart };
export type { LogsRatesMetrics, LogsRatesServiceReturnType, } from './services/get_logs_rates_service';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").LogsDataAccessPlugin>;
