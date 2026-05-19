import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
export interface LogsErrorRateTimeseries {
    esClient: ElasticsearchClient;
    serviceEnvironmentQuery?: QueryDslQueryContainer[];
    serviceNames: string[];
    identifyingMetadata: string;
    timeFrom: number;
    timeTo: number;
    kuery?: string;
}
export interface LogsErrorRateTimeseriesReturnType {
    [serviceName: string]: Array<{
        x: number;
        y: number | null;
    }>;
}
export declare function createGetLogErrorRateTimeseries(): ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo, kuery, serviceEnvironmentQuery, }: LogsErrorRateTimeseries) => Promise<LogsErrorRateTimeseriesReturnType>;
