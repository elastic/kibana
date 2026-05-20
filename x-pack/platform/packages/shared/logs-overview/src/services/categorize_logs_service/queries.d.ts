import type { AggregationsCategorizeTextAnalyzer, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
export declare const createCategorizationQuery: ({ messageField, timeField, startTimestamp, endTimestamp, additionalFilters, ignoredCategoryTerms, }: {
    messageField: string;
    timeField: string;
    startTimestamp: string;
    endTimestamp: string;
    additionalFilters?: QueryDslQueryContainer[];
    ignoredCategoryTerms?: string[];
}) => QueryDslQueryContainer;
export declare const createCategorizationRequestParams: ({ index, timeField, messageField, startTimestamp, endTimestamp, randomSampler, minDocsPerCategory, additionalFilters, ignoredCategoryTerms, maxCategoriesCount, }: {
    startTimestamp: string;
    endTimestamp: string;
    index: string;
    timeField: string;
    messageField: string;
    randomSampler: RandomSamplerWrapper;
    minDocsPerCategory?: number;
    additionalFilters?: QueryDslQueryContainer[];
    ignoredCategoryTerms?: string[];
    maxCategoriesCount?: number;
}) => {
    index: string;
    size: number;
    track_total_hits: boolean;
    query: QueryDslQueryContainer;
    aggs: Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregationContainer> | {
        histogram: {
            date_histogram: {
                field: string;
                fixed_interval: string;
                extended_bounds: {
                    min: string;
                    max: string;
                };
            };
        };
        categories: {
            categorize_text: {
                min_doc_count?: number | undefined;
                field: string;
                size: number;
                categorization_analyzer: AggregationsCategorizeTextAnalyzer;
            };
            aggs: {
                histogram: {
                    date_histogram: {
                        field: string;
                        fixed_interval: string;
                        extended_bounds: {
                            min: string;
                            max: string;
                        };
                    };
                };
                change: {
                    change_point: {
                        buckets_path: string;
                    };
                };
            };
        };
    };
};
export declare const createCategoryQuery: (messageField: string) => (categoryTerms: string) => QueryDslQueryContainer;
