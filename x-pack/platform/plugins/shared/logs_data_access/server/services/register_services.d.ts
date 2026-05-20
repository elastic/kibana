import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { Logger } from '@kbn/logging';
export interface RegisterServicesParams {
    logger: Logger;
    deps: {
        savedObjects: SavedObjectsServiceStart;
        uiSettings: UiSettingsServiceStart;
    };
}
export declare function registerServices(params: RegisterServicesParams): {
    getLogsRatesService: ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, }: import("./get_logs_rates_service").LogsRatesServiceParams) => Promise<import("./get_logs_rates_service").LogsRatesServiceReturnType>;
    getLogsRateTimeseries: ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, kuery, serviceEnvironmentQuery, }: import("./get_logs_rate_timeseries/get_logs_rate_timeseries").LogsRateTimeseries) => Promise<import("./get_logs_rate_timeseries/get_logs_rate_timeseries").LogsRateTimeseriesReturnType>;
    getLogsErrorRateTimeseries: ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, kuery, serviceEnvironmentQuery, }: import("./get_logs_error_rate_timeseries/get_logs_error_rate_timeseries").LogsErrorRateTimeseries) => Promise<import("./get_logs_error_rate_timeseries/get_logs_error_rate_timeseries").LogsErrorRateTimeseriesReturnType>;
    logSourcesServiceFactory: {
        getLogSourcesService(savedObjectsClient: import("@kbn/core/server").SavedObjectsClientContract): Promise<import("../../common/types").LogSourcesService>;
        getScopedLogSourcesService(request: import("@kbn/core/server").KibanaRequest): Promise<import("../../common/types").LogSourcesService>;
    };
};
