import type { CoreStart } from '@kbn/core/public';
import type { Plugin } from '@kbn/core/public';
import type { LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps } from './types';
export type LogsDataAccessPluginSetup = ReturnType<LogsDataAccessPlugin['setup']>;
export type LogsDataAccessPluginStart = ReturnType<LogsDataAccessPlugin['start']>;
export declare class LogsDataAccessPlugin implements Plugin<LogsDataAccessPluginSetup, LogsDataAccessPluginStart, LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps> {
    setup(): void;
    start(core: CoreStart, plugins: LogsDataAccessPluginStartDeps): {
        services: {
            logSourcesService: import("../common/types").LogSourcesService;
            logDataService: import("./services/log_data_service").LogDataService;
        };
    };
    stop(): void;
}
