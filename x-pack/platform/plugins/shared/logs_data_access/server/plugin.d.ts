import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LogsDataAccessPluginStartDeps, LogsDataAccessPluginSetupDeps } from './types';
export type LogsDataAccessPluginSetup = ReturnType<LogsDataAccessPlugin['setup']>;
export type LogsDataAccessPluginStart = ReturnType<LogsDataAccessPlugin['start']>;
export declare class LogsDataAccessPlugin implements Plugin<LogsDataAccessPluginSetup, LogsDataAccessPluginStart, LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps> {
    private readonly logger;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, plugins: LogsDataAccessPluginSetupDeps): void;
    start(core: CoreStart, plugins: LogsDataAccessPluginStartDeps): {
        services: {
            getLogsRatesService: ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, }: import("./services/get_logs_rates_service").LogsRatesServiceParams) => Promise<import(".").LogsRatesServiceReturnType>;
            getLogsRateTimeseries: ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, kuery, serviceEnvironmentQuery, }: import("./services/get_logs_rate_timeseries/get_logs_rate_timeseries").LogsRateTimeseries) => Promise<import("./services/get_logs_rate_timeseries/get_logs_rate_timeseries").LogsRateTimeseriesReturnType>;
            getLogsErrorRateTimeseries: ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, kuery, serviceEnvironmentQuery, }: import("./services/get_logs_error_rate_timeseries/get_logs_error_rate_timeseries").LogsErrorRateTimeseries) => Promise<import("./services/get_logs_error_rate_timeseries/get_logs_error_rate_timeseries").LogsErrorRateTimeseriesReturnType>;
            logSourcesServiceFactory: {
                getLogSourcesService(savedObjectsClient: import("@kbn/core/server").SavedObjectsClientContract): Promise<import("../common/types").LogSourcesService>;
                getScopedLogSourcesService(request: import("@kbn/core/server").KibanaRequest): Promise<import("../common/types").LogSourcesService>;
            };
        };
    };
}
