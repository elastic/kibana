import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
export interface LogsRateTimeseries {
    esClient: ElasticsearchClient;
    serviceEnvironmentQuery?: QueryDslQueryContainer[];
    serviceNames: string[];
    identifyingMetadata: string;
    timeFrom: number;
    timeTo: number;
    kuery?: string;
}
export interface LogsRateTimeseriesReturnType {
    [serviceName: string]: Array<{
        x: number;
        y: number | null;
    }>;
}
export declare function createGetLogsRateTimeseries(): ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, kuery, serviceEnvironmentQuery, }: LogsRateTimeseries) => Promise<LogsRateTimeseriesReturnType>;
