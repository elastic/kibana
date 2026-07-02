import type { estypes } from '@elastic/elasticsearch';
import * as t from 'io-ts';
export declare const sortOrderSchema: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
type SortOrderSchema = 'asc' | 'desc' | '_doc';
export declare const sortSchema: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
    missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
    order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
}>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
    missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
    order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
}>>]>>]>>]>;
export declare const minDocCount: t.NumberC;
interface BucketAggsSchemas {
    filter?: {
        term?: {
            [x: string]: string | boolean | number;
        };
    };
    histogram?: {
        field?: string;
        interval?: number;
        min_doc_count?: number;
        extended_bounds?: {
            min: number;
            max: number;
        };
        hard_bounds?: {
            min: number;
            max: number;
        };
        missing?: number;
        keyed?: boolean;
        order?: {
            _count: string;
            _key: string;
        };
    };
    nested?: {
        path: string;
    };
    terms?: {
        field?: string;
        collect_mode?: string;
        exclude?: string | string[];
        include?: string | string[];
        execution_hint?: string;
        missing?: number | string;
        min_doc_count?: number;
        size?: number;
        show_term_doc_count_error?: boolean;
        order?: SortOrderSchema | {
            [x: string]: SortOrderSchema;
        } | Array<{
            [x: string]: SortOrderSchema;
        }>;
    };
    aggs?: BucketAggsSchemas;
    aggregations?: BucketAggsSchemas;
}
/**
 * Schemas for the metrics Aggregations
 *
 * Currently supported:
 * - avg
 * - cardinality
 * - min
 * - max
 * - sum
 * - top_hits
 * - weighted_avg
 *
 * Not implemented:
 * - boxplot
 * - extended_stats
 * - geo_bounds
 * - geo_centroid
 * - geo_line
 * - matrix_stats
 * - median_absolute_deviation
 * - percentile_ranks
 * - percentiles
 * - rate
 * - scripted_metric
 * - stats
 * - string_stats
 * - t_test
 * - value_count
 */
export declare const metricsAggsSchemas: t.ExactC<t.PartialC<{
    avg: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    }>>;
    cardinality: t.ExactC<t.PartialC<{
        field: t.StringC;
        precision_threshold: t.NumberC;
        rehash: t.BooleanC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    }>>;
    min: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        format: t.StringC;
    }>>;
    max: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        format: t.StringC;
    }>>;
    sum: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    }>>;
    top_hits: t.ExactC<t.PartialC<{
        explain: t.BooleanC;
        docvalue_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
        stored_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
        from: t.NumberC;
        size: t.NumberC;
        sort: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
            order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
        }>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
            order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
        }>>]>>]>>]>;
        seq_no_primary_term: t.BooleanC;
        version: t.BooleanC;
        track_scores: t.BooleanC;
        highlight: t.AnyC;
        _source: t.UnionC<[t.BooleanC, t.StringC, t.ArrayC<t.StringC>]>;
    }>>;
    weighted_avg: t.ExactC<t.PartialC<{
        format: t.StringC;
        value_type: t.StringC;
        value: t.PartialC<{
            field: t.StringC;
            missing: t.NumberC;
        }>;
        weight: t.PartialC<{
            field: t.StringC;
            missing: t.NumberC;
        }>;
    }>>;
}>>;
export declare const bucketAggsSchemas: t.IntersectionC<[t.Type<BucketAggsSchemas, BucketAggsSchemas, unknown>, t.ExactC<t.PartialC<{
    aggs: t.RecordC<t.StringC, t.IntersectionC<[t.Type<BucketAggsSchemas, BucketAggsSchemas, unknown>, t.ExactC<t.PartialC<{
        avg: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        cardinality: t.ExactC<t.PartialC<{
            field: t.StringC;
            precision_threshold: t.NumberC;
            rehash: t.BooleanC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        min: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        max: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        sum: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        top_hits: t.ExactC<t.PartialC<{
            explain: t.BooleanC;
            docvalue_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            stored_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            from: t.NumberC;
            size: t.NumberC;
            sort: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>>]>;
            seq_no_primary_term: t.BooleanC;
            version: t.BooleanC;
            track_scores: t.BooleanC;
            highlight: t.AnyC;
            _source: t.UnionC<[t.BooleanC, t.StringC, t.ArrayC<t.StringC>]>;
        }>>;
        weighted_avg: t.ExactC<t.PartialC<{
            format: t.StringC;
            value_type: t.StringC;
            value: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
            weight: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
        }>>;
    }>>]>>;
    aggregations: t.RecordC<t.StringC, t.IntersectionC<[t.Type<BucketAggsSchemas, BucketAggsSchemas, unknown>, t.ExactC<t.PartialC<{
        avg: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        cardinality: t.ExactC<t.PartialC<{
            field: t.StringC;
            precision_threshold: t.NumberC;
            rehash: t.BooleanC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        min: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        max: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        sum: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        top_hits: t.ExactC<t.PartialC<{
            explain: t.BooleanC;
            docvalue_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            stored_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            from: t.NumberC;
            size: t.NumberC;
            sort: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>>]>;
            seq_no_primary_term: t.BooleanC;
            version: t.BooleanC;
            track_scores: t.BooleanC;
            highlight: t.AnyC;
            _source: t.UnionC<[t.BooleanC, t.StringC, t.ArrayC<t.StringC>]>;
        }>>;
        weighted_avg: t.ExactC<t.PartialC<{
            format: t.StringC;
            value_type: t.StringC;
            value: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
            weight: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
        }>>;
    }>>]>>;
}>>]>;
export declare const alertsAggregationsSchema: t.RecordC<t.StringC, t.IntersectionC<[t.ExactC<t.PartialC<{
    avg: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    }>>;
    cardinality: t.ExactC<t.PartialC<{
        field: t.StringC;
        precision_threshold: t.NumberC;
        rehash: t.BooleanC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    }>>;
    min: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        format: t.StringC;
    }>>;
    max: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        format: t.StringC;
    }>>;
    sum: t.ExactC<t.PartialC<{
        field: t.StringC;
        missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
    }>>;
    top_hits: t.ExactC<t.PartialC<{
        explain: t.BooleanC;
        docvalue_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
        stored_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
        from: t.NumberC;
        size: t.NumberC;
        sort: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
            order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
        }>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
            order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
        }>>]>>]>>]>;
        seq_no_primary_term: t.BooleanC;
        version: t.BooleanC;
        track_scores: t.BooleanC;
        highlight: t.AnyC;
        _source: t.UnionC<[t.BooleanC, t.StringC, t.ArrayC<t.StringC>]>;
    }>>;
    weighted_avg: t.ExactC<t.PartialC<{
        format: t.StringC;
        value_type: t.StringC;
        value: t.PartialC<{
            field: t.StringC;
            missing: t.NumberC;
        }>;
        weight: t.PartialC<{
            field: t.StringC;
            missing: t.NumberC;
        }>;
    }>>;
}>>, t.IntersectionC<[t.Type<BucketAggsSchemas, BucketAggsSchemas, unknown>, t.ExactC<t.PartialC<{
    aggs: t.RecordC<t.StringC, t.IntersectionC<[t.Type<BucketAggsSchemas, BucketAggsSchemas, unknown>, t.ExactC<t.PartialC<{
        avg: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        cardinality: t.ExactC<t.PartialC<{
            field: t.StringC;
            precision_threshold: t.NumberC;
            rehash: t.BooleanC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        min: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        max: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        sum: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        top_hits: t.ExactC<t.PartialC<{
            explain: t.BooleanC;
            docvalue_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            stored_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            from: t.NumberC;
            size: t.NumberC;
            sort: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>>]>;
            seq_no_primary_term: t.BooleanC;
            version: t.BooleanC;
            track_scores: t.BooleanC;
            highlight: t.AnyC;
            _source: t.UnionC<[t.BooleanC, t.StringC, t.ArrayC<t.StringC>]>;
        }>>;
        weighted_avg: t.ExactC<t.PartialC<{
            format: t.StringC;
            value_type: t.StringC;
            value: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
            weight: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
        }>>;
    }>>]>>;
    aggregations: t.RecordC<t.StringC, t.IntersectionC<[t.Type<BucketAggsSchemas, BucketAggsSchemas, unknown>, t.ExactC<t.PartialC<{
        avg: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        cardinality: t.ExactC<t.PartialC<{
            field: t.StringC;
            precision_threshold: t.NumberC;
            rehash: t.BooleanC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        min: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        max: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
            format: t.StringC;
        }>>;
        sum: t.ExactC<t.PartialC<{
            field: t.StringC;
            missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
        }>>;
        top_hits: t.ExactC<t.PartialC<{
            explain: t.BooleanC;
            docvalue_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            stored_fields: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
            from: t.NumberC;
            size: t.NumberC;
            sort: t.UnionC<[t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>, t.ArrayC<t.UnionC<[t.StringC, t.RecordC<t.StringC, t.UnionC<[t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>, t.ExactC<t.PartialC<{
                missing: t.UnionC<[t.StringC, t.NumberC, t.BooleanC]>;
                mode: t.UnionC<[t.LiteralC<"min">, t.LiteralC<"max">, t.LiteralC<"sum">, t.LiteralC<"avg">, t.LiteralC<"median">]>;
                order: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">, t.LiteralC<"_doc">]>;
            }>>]>>]>>]>;
            seq_no_primary_term: t.BooleanC;
            version: t.BooleanC;
            track_scores: t.BooleanC;
            highlight: t.AnyC;
            _source: t.UnionC<[t.BooleanC, t.StringC, t.ArrayC<t.StringC>]>;
        }>>;
        weighted_avg: t.ExactC<t.PartialC<{
            format: t.StringC;
            value_type: t.StringC;
            value: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
            weight: t.PartialC<{
                field: t.StringC;
                missing: t.NumberC;
            }>;
        }>>;
    }>>]>>;
}>>]>]>>;
export declare const alertsGroupFilterSchema: t.RecordC<t.UnionC<[t.LiteralC<"bool">, t.LiteralC<"boosting">, t.LiteralC<"common">, t.LiteralC<"combined_fields">, t.LiteralC<"constant_score">, t.LiteralC<"dis_max">, t.LiteralC<"distance_feature">, t.LiteralC<"exists">, t.LiteralC<"function_score">, t.LiteralC<"fuzzy">, t.LiteralC<"geo_bounding_box">, t.LiteralC<"geo_distance">, t.LiteralC<"geo_polygon">, t.LiteralC<"geo_shape">, t.LiteralC<"has_child">, t.LiteralC<"has_parent">, t.LiteralC<"ids">, t.LiteralC<"intervals">, t.LiteralC<"knn">, t.LiteralC<"match">, t.LiteralC<"match_all">, t.LiteralC<"match_bool_prefix">, t.LiteralC<"match_none">, t.LiteralC<"match_phrase">, t.LiteralC<"match_phrase_prefix">, t.LiteralC<"more_like_this">, t.LiteralC<"multi_match">, t.LiteralC<"nested">, t.LiteralC<"parent_id">, t.LiteralC<"percolate">, t.LiteralC<"pinned">, t.LiteralC<"prefix">, t.LiteralC<"query_string">, t.LiteralC<"range">, t.LiteralC<"rank_feature">, t.LiteralC<"regexp">, t.LiteralC<"rule">, t.LiteralC<"semantic">, t.LiteralC<"shape">, t.LiteralC<"simple_query_string">, t.LiteralC<"span_containing">, t.LiteralC<"span_field_masking">, t.LiteralC<"span_first">, t.LiteralC<"span_multi">, t.LiteralC<"span_near">, t.LiteralC<"span_not">, t.LiteralC<"span_or">, t.LiteralC<"span_term">, t.LiteralC<"span_within">, t.LiteralC<"term">, t.LiteralC<"terms">, t.LiteralC<"terms_set">, t.LiteralC<"text_expansion">, t.LiteralC<"weighted_tokens">, t.LiteralC<"wildcard">, t.LiteralC<"wrapper">, t.LiteralC<"type">]>, t.AnyC>;
export type PutIndexTemplateRequest = estypes.IndicesPutIndexTemplateRequest & {
    body?: {
        composed_of?: string[];
    };
};
export interface ClusterPutComponentTemplateBody {
    template: {
        settings: {
            number_of_shards: number;
            'index.mapping.total_fields.limit'?: number;
        };
        mappings: estypes.MappingTypeMapping;
    };
}
export {};
