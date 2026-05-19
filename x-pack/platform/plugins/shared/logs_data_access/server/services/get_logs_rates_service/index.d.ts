import type { ElasticsearchClient } from '@kbn/core/server';
export interface LogsRatesServiceParams {
    esClient: ElasticsearchClient;
    serviceNames: string[];
    identifyingMetadata: string;
    timeFrom: number;
    timeTo: number;
}
export interface LogsRatesMetrics {
    logRatePerMinute: number;
    logErrorRate: null | number;
}
export interface LogsRatesServiceReturnType {
    [serviceName: string]: LogsRatesMetrics;
}
export declare function createGetLogsRatesService(): ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, }: LogsRatesServiceParams) => Promise<LogsRatesServiceReturnType>;
