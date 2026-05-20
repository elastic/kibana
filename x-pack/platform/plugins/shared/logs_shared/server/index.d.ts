import type { PluginInitializerContext } from '@kbn/core/server';
export type { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';
export type { LogsSharedLogEntriesDomain, ILogsSharedLogEntriesDomain, } from './lib/domains/log_entries_domain';
export { config } from './config';
export { logViewSavedObjectName } from './saved_objects';
export declare function plugin(context: PluginInitializerContext): Promise<import("./plugin").LogsSharedPlugin>;
