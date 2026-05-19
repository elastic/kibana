import * as rt from 'io-ts';
import type { estypes } from '@elastic/elasticsearch';
export declare const createLogEntryDatasetsQuery: (indexName: string, timestampField: string, startTime: number, endTime: number, runtimeMappings: estypes.MappingRuntimeFields, size: number, afterKey?: CompositeDatasetKey) => {
    body: {
        query: {
            bool: {
                filter: ({
                    range: {
                        [x: string]: {
                            gte: number;
                            lte: number;
                            format: string;
                        };
                    };
                    exists?: undefined;
                } | {
                    exists: {
                        field: string;
                    };
                    range?: undefined;
                })[];
            };
        };
        runtime_mappings: estypes.MappingRuntimeFields;
        aggs: {
            dataset_buckets: {
                composite: {
                    after: {
                        dataset: string;
                    } | undefined;
                    size: number;
                    sources: {
                        dataset: {
                            terms: {
                                field: string;
                                order: string;
                            };
                        };
                    }[];
                };
            };
        };
    };
    index: string;
    size: number;
    allow_no_indices: boolean;
    ignore_unavailable: boolean;
    track_scores: boolean;
    track_total_hits: boolean;
};
declare const compositeDatasetKeyRT: rt.TypeC<{
    dataset: rt.StringC;
}>;
export type CompositeDatasetKey = rt.TypeOf<typeof compositeDatasetKeyRT>;
declare const logEntryDatasetBucketRT: rt.TypeC<{
    key: rt.TypeC<{
        dataset: rt.StringC;
    }>;
}>;
export type LogEntryDatasetBucket = rt.TypeOf<typeof logEntryDatasetBucketRT>;
export declare const logEntryDatasetsResponseRT: rt.IntersectionC<[rt.TypeC<{
    _shards: rt.IntersectionC<[rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>, rt.PartialC<{
        failures: rt.ArrayC<rt.PartialC<{
            index: rt.UnionC<[rt.StringC, rt.NullC]>;
            node: rt.UnionC<[rt.StringC, rt.NullC]>;
            reason: rt.PartialC<{
                reason: rt.UnionC<[rt.StringC, rt.NullC]>;
                type: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>;
            shard: rt.NumberC;
        }>>;
    }>]>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.TypeC<{
    aggregations: rt.TypeC<{
        dataset_buckets: rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.TypeC<{
                key: rt.TypeC<{
                    dataset: rt.StringC;
                }>;
            }>>;
        }>, rt.PartialC<{
            after_key: rt.TypeC<{
                dataset: rt.StringC;
            }>;
        }>]>;
    }>;
}>]>;
export {};
