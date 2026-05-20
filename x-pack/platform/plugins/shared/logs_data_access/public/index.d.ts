import type { PluginInitializer } from '@kbn/core/public';
import type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart } from './plugin';
export type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart };
import type { LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps } from './types';
export { LogSourcesProvider, useLogSourcesContext } from './hooks/use_log_sources';
export { LogSourcesSettingSynchronisationInfo } from './components/logs_sources_setting';
export declare const plugin: PluginInitializer<LogsDataAccessPluginSetup, LogsDataAccessPluginStart, LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps>;
