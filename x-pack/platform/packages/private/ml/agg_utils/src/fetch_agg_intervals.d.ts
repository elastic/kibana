import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { HistogramField, NumericColumnStatsMap } from './types';
/**
 * Interface for the parameters required to fetch aggregation intervals.
 */
export interface FetchAggIntervalsParams {
    /** The Elasticsearch client to use for the query. */
    esClient: ElasticsearchClient;
    /** An optional abort signal to cancel the request. */
    abortSignal?: AbortSignal;
    /** The arguments for the aggregation query. */
    arguments: {
        /** The index pattern to query against. */
        indexPattern: string;
        /** The query to filter documents. */
        query: estypes.QueryDslQueryContainer;
        /** The fields to aggregate on. */
        fields: HistogramField[];
        /** The size of the sampler shard. */
        samplerShardSize: number;
        /** Optional runtime mappings for the query. */
        runtimeMappings?: estypes.MappingRuntimeFields;
        /** Optional project routing for the query. */
        projectRouting?: string;
        /** Optional probability for random sampling. */
        randomSamplerProbability?: number;
        /** Optional seed for random sampling. */
        randomSamplerSeed?: number;
    };
}
/**
 * Asynchronously fetches aggregation intervals from an Elasticsearch client.
 *
 * @param params - The parameters for fetching aggregation intervals.
 * @returns A promise that resolves to a map of numeric column statistics.
 */
export declare const fetchAggIntervals: (params: FetchAggIntervalsParams) => Promise<NumericColumnStatsMap>;
