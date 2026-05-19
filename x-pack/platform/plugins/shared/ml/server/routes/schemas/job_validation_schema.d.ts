import { ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
export declare const estimateBucketSpanSchema: import("@kbn/config-schema").ObjectType<{
    aggTypes: import("@kbn/config-schema").Type<(ES_AGGREGATION | null)[]>;
    duration: import("@kbn/config-schema").ObjectType<{
        start: import("@kbn/config-schema").Type<number>;
        end: import("@kbn/config-schema").Type<number>;
    }>;
    fields: import("@kbn/config-schema").Type<(string | null)[]>;
    filters: import("@kbn/config-schema").Type<any[] | undefined>;
    index: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").AnyType;
    splitField: import("@kbn/config-schema").Type<string | undefined>;
    timeField: import("@kbn/config-schema").Type<string | undefined>;
    runtimeMappings: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    indicesOptions: import("@kbn/config-schema").Type<Readonly<{
        allow_no_indices?: boolean | undefined;
        expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
        ignore_throttled?: boolean | undefined;
        ignore_unavailable?: boolean | undefined;
        failure_store?: string | undefined;
    } & {}> | undefined>;
}>;
export declare const modelMemoryLimitSchema: import("@kbn/config-schema").ObjectType<{
    datafeedConfig: import("@kbn/config-schema").ObjectType<{
        datafeed_id: import("@kbn/config-schema").Type<string | undefined>;
        feed_id: import("@kbn/config-schema").Type<string | undefined>;
        aggregations: import("@kbn/config-schema").Type<any>;
        aggs: import("@kbn/config-schema").Type<any>;
        chunking_config: import("@kbn/config-schema").Type<Readonly<{
            time_span?: string | number | undefined;
        } & {
            mode: "off" | "auto" | "manual";
        }> | undefined>;
        frequency: import("@kbn/config-schema").Type<string | undefined>;
        indices: import("@kbn/config-schema").Type<string[] | undefined>;
        indexes: import("@kbn/config-schema").Type<string[] | undefined>;
        job_id: import("@kbn/config-schema").Type<string | undefined>;
        query: import("@kbn/config-schema").Type<any>;
        max_empty_searches: import("@kbn/config-schema").Type<number | undefined>;
        query_delay: import("@kbn/config-schema").Type<string | undefined>;
        script_fields: import("@kbn/config-schema").Type<any>;
        runtime_mappings: import("@kbn/config-schema").Type<any>;
        scroll_size: import("@kbn/config-schema").Type<number | undefined>;
        delayed_data_check_config: import("@kbn/config-schema").Type<any>;
        indices_options: import("@kbn/config-schema").Type<Readonly<{
            allow_no_indices?: boolean | undefined;
            expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
            ignore_throttled?: boolean | undefined;
            ignore_unavailable?: boolean | undefined;
            failure_store?: string | undefined;
        } & {}> | undefined>;
    }>;
    analysisConfig: import("@kbn/config-schema").ObjectType<{
        bucket_span: import("@kbn/config-schema").Type<string>;
        summary_count_field_name: import("@kbn/config-schema").Type<string | undefined>;
        detectors: import("@kbn/config-schema").Type<Readonly<{
            field_name?: string | undefined;
            identifier?: string | undefined;
            by_field_name?: string | undefined;
            detector_index?: number | undefined;
            over_field_name?: string | undefined;
            partition_field_name?: string | undefined;
            detector_description?: string | undefined;
            exclude_frequent?: "all" | "none" | "by" | "over" | undefined;
            use_null?: boolean | undefined;
            custom_rules?: Readonly<{
                params?: any;
                scope?: any;
                conditions?: any[] | undefined;
            } & {
                actions: ("skip_model_update" | "skip_result" | "force_time_shift")[];
            }>[] | undefined;
        } & {
            function: string;
        }>[]>;
        influencers: import("@kbn/config-schema").Type<string[]>;
        categorization_field_name: import("@kbn/config-schema").Type<string | undefined>;
        categorization_analyzer: import("@kbn/config-schema").Type<any>;
        categorization_filters: import("@kbn/config-schema").Type<string[] | undefined>;
        latency: import("@kbn/config-schema").Type<number | undefined>;
        multivariate_by_fields: import("@kbn/config-schema").Type<boolean | undefined>;
        per_partition_categorization: import("@kbn/config-schema").Type<Readonly<{
            stop_on_warn?: boolean | undefined;
        } & {
            enabled: boolean;
        }> | undefined>;
        model_prune_window: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    indexPattern: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").AnyType;
    timeFieldName: import("@kbn/config-schema").Type<string>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
}>;
export declare const validateJobSchema: import("@kbn/config-schema").ObjectType<{
    duration: import("@kbn/config-schema").Type<Readonly<{
        start?: number | undefined;
        end?: number | undefined;
    } & {}> | undefined>;
    fields: import("@kbn/config-schema").Type<any>;
    job: import("@kbn/config-schema").ObjectType<{
        datafeed_config: import("@kbn/config-schema").ObjectType<{
            datafeed_id: import("@kbn/config-schema").Type<string | undefined>;
            feed_id: import("@kbn/config-schema").Type<string | undefined>;
            aggregations: import("@kbn/config-schema").Type<any>;
            aggs: import("@kbn/config-schema").Type<any>;
            chunking_config: import("@kbn/config-schema").Type<Readonly<{
                time_span?: string | number | undefined;
            } & {
                mode: "off" | "auto" | "manual";
            }> | undefined>;
            frequency: import("@kbn/config-schema").Type<string | undefined>;
            indices: import("@kbn/config-schema").Type<string[] | undefined>;
            indexes: import("@kbn/config-schema").Type<string[] | undefined>;
            job_id: import("@kbn/config-schema").Type<string | undefined>;
            query: import("@kbn/config-schema").Type<any>;
            max_empty_searches: import("@kbn/config-schema").Type<number | undefined>;
            query_delay: import("@kbn/config-schema").Type<string | undefined>;
            script_fields: import("@kbn/config-schema").Type<any>;
            runtime_mappings: import("@kbn/config-schema").Type<any>;
            scroll_size: import("@kbn/config-schema").Type<number | undefined>;
            delayed_data_check_config: import("@kbn/config-schema").Type<any>;
            indices_options: import("@kbn/config-schema").Type<Readonly<{
                allow_no_indices?: boolean | undefined;
                expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
                ignore_throttled?: boolean | undefined;
                ignore_unavailable?: boolean | undefined;
                failure_store?: string | undefined;
            } & {}> | undefined>;
        }>;
        analysis_config: import("@kbn/config-schema").ObjectType<{
            bucket_span: import("@kbn/config-schema").Type<string>;
            summary_count_field_name: import("@kbn/config-schema").Type<string | undefined>;
            detectors: import("@kbn/config-schema").Type<Readonly<{
                field_name?: string | undefined;
                identifier?: string | undefined;
                by_field_name?: string | undefined;
                detector_index?: number | undefined;
                over_field_name?: string | undefined;
                partition_field_name?: string | undefined;
                detector_description?: string | undefined;
                exclude_frequent?: "all" | "none" | "by" | "over" | undefined;
                use_null?: boolean | undefined;
                custom_rules?: Readonly<{
                    params?: any;
                    scope?: any;
                    conditions?: any[] | undefined;
                } & {
                    actions: ("skip_model_update" | "skip_result" | "force_time_shift")[];
                }>[] | undefined;
            } & {
                function: string;
            }>[]>;
            influencers: import("@kbn/config-schema").Type<string[]>;
            categorization_field_name: import("@kbn/config-schema").Type<string | undefined>;
            categorization_analyzer: import("@kbn/config-schema").Type<any>;
            categorization_filters: import("@kbn/config-schema").Type<string[] | undefined>;
            latency: import("@kbn/config-schema").Type<number | undefined>;
            multivariate_by_fields: import("@kbn/config-schema").Type<boolean | undefined>;
            per_partition_categorization: import("@kbn/config-schema").Type<Readonly<{
                stop_on_warn?: boolean | undefined;
            } & {
                enabled: boolean;
            }> | undefined>;
            model_prune_window: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        analysis_limits: import("@kbn/config-schema").Type<Readonly<{
            categorization_examples_limit?: number | undefined;
        } & {
            model_memory_limit: string;
        }> | undefined>;
        background_persist_interval: import("@kbn/config-schema").Type<string | undefined>;
        create_time: import("@kbn/config-schema").Type<number | undefined>;
        custom_settings: import("@kbn/config-schema").Type<Readonly<{
            created_by?: string | undefined;
            custom_urls?: (Readonly<{
                time_range?: any;
            } & {
                url_name: string;
                url_value: string;
            }> | undefined)[] | undefined;
        } & {}> | undefined>;
        allow_lazy_open: import("@kbn/config-schema").Type<any>;
        data_counts: import("@kbn/config-schema").Type<any>;
        data_description: import("@kbn/config-schema").ObjectType<{
            format: import("@kbn/config-schema").Type<string | undefined>;
            time_field: import("@kbn/config-schema").Type<string>;
            time_format: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        established_model_memory: import("@kbn/config-schema").Type<number | undefined>;
        finished_time: import("@kbn/config-schema").Type<number | undefined>;
        job_id: import("@kbn/config-schema").Type<string | undefined>;
        job_type: import("@kbn/config-schema").Type<string | undefined>;
        job_version: import("@kbn/config-schema").Type<string | undefined>;
        groups: import("@kbn/config-schema").Type<(string | undefined)[] | undefined>;
        model_plot_config: import("@kbn/config-schema").Type<any>;
        model_plot: import("@kbn/config-schema").Type<any>;
        model_size_stats: import("@kbn/config-schema").Type<any>;
        model_snapshot_id: import("@kbn/config-schema").Type<string | undefined>;
        model_snapshot_min_version: import("@kbn/config-schema").Type<string | undefined>;
        model_snapshot_retention_days: import("@kbn/config-schema").Type<number | undefined>;
        daily_model_snapshot_retention_after_days: import("@kbn/config-schema").Type<number | undefined>;
        renormalization_window_days: import("@kbn/config-schema").Type<number | undefined>;
        results_index_name: import("@kbn/config-schema").Type<string | undefined>;
        results_retention_days: import("@kbn/config-schema").Type<number | undefined>;
        state: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
export declare const validateDatafeedPreviewSchema: import("@kbn/config-schema").ObjectType<{
    job: import("@kbn/config-schema").ObjectType<{
        datafeed_config: import("@kbn/config-schema").ObjectType<{
            datafeed_id: import("@kbn/config-schema").Type<string | undefined>;
            feed_id: import("@kbn/config-schema").Type<string | undefined>;
            aggregations: import("@kbn/config-schema").Type<any>;
            aggs: import("@kbn/config-schema").Type<any>;
            chunking_config: import("@kbn/config-schema").Type<Readonly<{
                time_span?: string | number | undefined;
            } & {
                mode: "off" | "auto" | "manual";
            }> | undefined>;
            frequency: import("@kbn/config-schema").Type<string | undefined>;
            indices: import("@kbn/config-schema").Type<string[] | undefined>;
            indexes: import("@kbn/config-schema").Type<string[] | undefined>;
            job_id: import("@kbn/config-schema").Type<string | undefined>;
            query: import("@kbn/config-schema").Type<any>;
            max_empty_searches: import("@kbn/config-schema").Type<number | undefined>;
            query_delay: import("@kbn/config-schema").Type<string | undefined>;
            script_fields: import("@kbn/config-schema").Type<any>;
            runtime_mappings: import("@kbn/config-schema").Type<any>;
            scroll_size: import("@kbn/config-schema").Type<number | undefined>;
            delayed_data_check_config: import("@kbn/config-schema").Type<any>;
            indices_options: import("@kbn/config-schema").Type<Readonly<{
                allow_no_indices?: boolean | undefined;
                expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
                ignore_throttled?: boolean | undefined;
                ignore_unavailable?: boolean | undefined;
                failure_store?: string | undefined;
            } & {}> | undefined>;
        }>;
        analysis_config: import("@kbn/config-schema").ObjectType<{
            bucket_span: import("@kbn/config-schema").Type<string>;
            summary_count_field_name: import("@kbn/config-schema").Type<string | undefined>;
            detectors: import("@kbn/config-schema").Type<Readonly<{
                field_name?: string | undefined;
                identifier?: string | undefined;
                by_field_name?: string | undefined;
                detector_index?: number | undefined;
                over_field_name?: string | undefined;
                partition_field_name?: string | undefined;
                detector_description?: string | undefined;
                exclude_frequent?: "all" | "none" | "by" | "over" | undefined;
                use_null?: boolean | undefined;
                custom_rules?: Readonly<{
                    params?: any;
                    scope?: any;
                    conditions?: any[] | undefined;
                } & {
                    actions: ("skip_model_update" | "skip_result" | "force_time_shift")[];
                }>[] | undefined;
            } & {
                function: string;
            }>[]>;
            influencers: import("@kbn/config-schema").Type<string[]>;
            categorization_field_name: import("@kbn/config-schema").Type<string | undefined>;
            categorization_analyzer: import("@kbn/config-schema").Type<any>;
            categorization_filters: import("@kbn/config-schema").Type<string[] | undefined>;
            latency: import("@kbn/config-schema").Type<number | undefined>;
            multivariate_by_fields: import("@kbn/config-schema").Type<boolean | undefined>;
            per_partition_categorization: import("@kbn/config-schema").Type<Readonly<{
                stop_on_warn?: boolean | undefined;
            } & {
                enabled: boolean;
            }> | undefined>;
            model_prune_window: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        analysis_limits: import("@kbn/config-schema").Type<Readonly<{
            categorization_examples_limit?: number | undefined;
        } & {
            model_memory_limit: string;
        }> | undefined>;
        background_persist_interval: import("@kbn/config-schema").Type<string | undefined>;
        create_time: import("@kbn/config-schema").Type<number | undefined>;
        custom_settings: import("@kbn/config-schema").Type<Readonly<{
            created_by?: string | undefined;
            custom_urls?: (Readonly<{
                time_range?: any;
            } & {
                url_name: string;
                url_value: string;
            }> | undefined)[] | undefined;
        } & {}> | undefined>;
        allow_lazy_open: import("@kbn/config-schema").Type<any>;
        data_counts: import("@kbn/config-schema").Type<any>;
        data_description: import("@kbn/config-schema").ObjectType<{
            format: import("@kbn/config-schema").Type<string | undefined>;
            time_field: import("@kbn/config-schema").Type<string>;
            time_format: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        established_model_memory: import("@kbn/config-schema").Type<number | undefined>;
        finished_time: import("@kbn/config-schema").Type<number | undefined>;
        job_id: import("@kbn/config-schema").Type<string | undefined>;
        job_type: import("@kbn/config-schema").Type<string | undefined>;
        job_version: import("@kbn/config-schema").Type<string | undefined>;
        groups: import("@kbn/config-schema").Type<(string | undefined)[] | undefined>;
        model_plot_config: import("@kbn/config-schema").Type<any>;
        model_plot: import("@kbn/config-schema").Type<any>;
        model_size_stats: import("@kbn/config-schema").Type<any>;
        model_snapshot_id: import("@kbn/config-schema").Type<string | undefined>;
        model_snapshot_min_version: import("@kbn/config-schema").Type<string | undefined>;
        model_snapshot_retention_days: import("@kbn/config-schema").Type<number | undefined>;
        daily_model_snapshot_retention_after_days: import("@kbn/config-schema").Type<number | undefined>;
        renormalization_window_days: import("@kbn/config-schema").Type<number | undefined>;
        results_index_name: import("@kbn/config-schema").Type<string | undefined>;
        results_retention_days: import("@kbn/config-schema").Type<number | undefined>;
        state: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    start: import("@kbn/config-schema").Type<number | undefined>;
    end: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const validateCardinalitySchema: import("@kbn/config-schema").ObjectType<{
    datafeed_config: import("@kbn/config-schema").ObjectType<{
        datafeed_id: import("@kbn/config-schema").Type<string | undefined>;
        feed_id: import("@kbn/config-schema").Type<string | undefined>;
        aggregations: import("@kbn/config-schema").Type<any>;
        aggs: import("@kbn/config-schema").Type<any>;
        chunking_config: import("@kbn/config-schema").Type<Readonly<{
            time_span?: string | number | undefined;
        } & {
            mode: "off" | "auto" | "manual";
        }> | undefined>;
        frequency: import("@kbn/config-schema").Type<string | undefined>;
        indices: import("@kbn/config-schema").Type<string[] | undefined>;
        indexes: import("@kbn/config-schema").Type<string[] | undefined>;
        job_id: import("@kbn/config-schema").Type<string | undefined>;
        query: import("@kbn/config-schema").Type<any>;
        max_empty_searches: import("@kbn/config-schema").Type<number | undefined>;
        query_delay: import("@kbn/config-schema").Type<string | undefined>;
        script_fields: import("@kbn/config-schema").Type<any>;
        runtime_mappings: import("@kbn/config-schema").Type<any>;
        scroll_size: import("@kbn/config-schema").Type<number | undefined>;
        delayed_data_check_config: import("@kbn/config-schema").Type<any>;
        indices_options: import("@kbn/config-schema").Type<Readonly<{
            allow_no_indices?: boolean | undefined;
            expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
            ignore_throttled?: boolean | undefined;
            ignore_unavailable?: boolean | undefined;
            failure_store?: string | undefined;
        } & {}> | undefined>;
    }>;
    analysis_config: import("@kbn/config-schema").ObjectType<{
        bucket_span: import("@kbn/config-schema").Type<string>;
        summary_count_field_name: import("@kbn/config-schema").Type<string | undefined>;
        detectors: import("@kbn/config-schema").Type<Readonly<{
            field_name?: string | undefined;
            identifier?: string | undefined;
            by_field_name?: string | undefined;
            detector_index?: number | undefined;
            over_field_name?: string | undefined;
            partition_field_name?: string | undefined;
            detector_description?: string | undefined;
            exclude_frequent?: "all" | "none" | "by" | "over" | undefined;
            use_null?: boolean | undefined;
            custom_rules?: Readonly<{
                params?: any;
                scope?: any;
                conditions?: any[] | undefined;
            } & {
                actions: ("skip_model_update" | "skip_result" | "force_time_shift")[];
            }>[] | undefined;
        } & {
            function: string;
        }>[]>;
        influencers: import("@kbn/config-schema").Type<string[]>;
        categorization_field_name: import("@kbn/config-schema").Type<string | undefined>;
        categorization_analyzer: import("@kbn/config-schema").Type<any>;
        categorization_filters: import("@kbn/config-schema").Type<string[] | undefined>;
        latency: import("@kbn/config-schema").Type<number | undefined>;
        multivariate_by_fields: import("@kbn/config-schema").Type<boolean | undefined>;
        per_partition_categorization: import("@kbn/config-schema").Type<Readonly<{
            stop_on_warn?: boolean | undefined;
        } & {
            enabled: boolean;
        }> | undefined>;
        model_prune_window: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    analysis_limits: import("@kbn/config-schema").Type<Readonly<{
        categorization_examples_limit?: number | undefined;
    } & {
        model_memory_limit: string;
    }> | undefined>;
    background_persist_interval: import("@kbn/config-schema").Type<string | undefined>;
    create_time: import("@kbn/config-schema").Type<number | undefined>;
    custom_settings: import("@kbn/config-schema").Type<Readonly<{
        created_by?: string | undefined;
        custom_urls?: (Readonly<{
            time_range?: any;
        } & {
            url_name: string;
            url_value: string;
        }> | undefined)[] | undefined;
    } & {}> | undefined>;
    allow_lazy_open: import("@kbn/config-schema").Type<any>;
    data_counts: import("@kbn/config-schema").Type<any>;
    data_description: import("@kbn/config-schema").ObjectType<{
        format: import("@kbn/config-schema").Type<string | undefined>;
        time_field: import("@kbn/config-schema").Type<string>;
        time_format: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    established_model_memory: import("@kbn/config-schema").Type<number | undefined>;
    finished_time: import("@kbn/config-schema").Type<number | undefined>;
    job_id: import("@kbn/config-schema").Type<string | undefined>;
    job_type: import("@kbn/config-schema").Type<string | undefined>;
    job_version: import("@kbn/config-schema").Type<string | undefined>;
    groups: import("@kbn/config-schema").Type<(string | undefined)[] | undefined>;
    model_plot_config: import("@kbn/config-schema").Type<any>;
    model_plot: import("@kbn/config-schema").Type<any>;
    model_size_stats: import("@kbn/config-schema").Type<any>;
    model_snapshot_id: import("@kbn/config-schema").Type<string | undefined>;
    model_snapshot_min_version: import("@kbn/config-schema").Type<string | undefined>;
    model_snapshot_retention_days: import("@kbn/config-schema").Type<number | undefined>;
    daily_model_snapshot_retention_after_days: import("@kbn/config-schema").Type<number | undefined>;
    renormalization_window_days: import("@kbn/config-schema").Type<number | undefined>;
    results_index_name: import("@kbn/config-schema").Type<string | undefined>;
    results_retention_days: import("@kbn/config-schema").Type<number | undefined>;
    state: import("@kbn/config-schema").Type<string | undefined>;
}>;
