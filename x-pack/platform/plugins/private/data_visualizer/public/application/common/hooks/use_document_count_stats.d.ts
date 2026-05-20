import type { Query } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { RandomSampler, RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
export declare const RANDOM_SAMPLER_SEED = 3867418;
export interface DocumentStats {
    sampleProbability: number;
    totalCount: number;
    documentCountStats?: DocumentCountStats;
    documentCountStatsCompare?: DocumentCountStats;
}
export interface DocumentCountStats {
    interval?: number;
    buckets?: {
        [key: string]: number;
    };
    timeRangeEarliest?: number;
    timeRangeLatest?: number;
    totalCount: number;
}
export interface DocumentStatsSearchStrategyParams {
    earliest?: number;
    latest?: number;
    intervalMs?: number;
    index: string;
    searchQuery: Query['query'];
    timeFieldName?: string;
    runtimeFieldMap?: estypes.MappingRuntimeFields;
    fieldsToFetch?: string[];
    selectedSignificantItem?: SignificantItem;
    includeSelectedSignificantItem?: boolean;
    trackTotalHits?: boolean;
}
export declare const getDocumentCountStatsRequest: (params: DocumentStatsSearchStrategyParams, randomSamplerWrapper?: RandomSamplerWrapper, skipAggs?: boolean) => {
    track_total_hits: boolean;
    size: number;
    runtime_mappings?: estypes.MappingRuntimeFields | undefined;
    aggs?: Record<string, estypes.AggregationsAggregationContainer> | undefined;
    query: {
        bool: {
            filter: estypes.QueryDslQueryContainer[];
        };
    };
    index: string;
};
export declare const processDocumentCountStats: (body: estypes.SearchResponse | undefined, params: DocumentStatsSearchStrategyParams, randomSamplerWrapper?: RandomSamplerWrapper) => DocumentCountStats | undefined;
export interface DocumentStatsSearchStrategyParams {
    earliest?: number;
    latest?: number;
    intervalMs?: number;
    index: string;
    searchQuery: Query['query'];
    timeFieldName?: string;
    runtimeFieldMap?: estypes.MappingRuntimeFields;
    fieldsToFetch?: string[];
    selectedSignificantItem?: SignificantItem;
    includeSelectedSignificantItem?: boolean;
    trackTotalHits?: boolean;
}
export declare function useDocumentCountStats<TParams extends DocumentStatsSearchStrategyParams>(searchParams: TParams | undefined, lastRefresh: number, randomSampler: RandomSampler): DocumentStats;
