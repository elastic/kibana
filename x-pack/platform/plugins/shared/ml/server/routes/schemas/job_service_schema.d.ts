export declare const categorizationFieldValidationSchema: {
    indexPatternTitle: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").AnyType;
    size: import("@kbn/config-schema").Type<number>;
    field: import("@kbn/config-schema").Type<string>;
    timeField: import("@kbn/config-schema").Type<string | undefined>;
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
    analyzer: import("@kbn/config-schema").AnyType;
    runtimeMappings: import("@kbn/config-schema").ObjectType<{}>;
    indicesOptions: import("@kbn/config-schema").ObjectType<{
        expand_wildcards: import("@kbn/config-schema").Type<("all" | "none" | "closed" | "hidden" | "open")[] | undefined>;
        ignore_unavailable: import("@kbn/config-schema").Type<boolean | undefined>;
        allow_no_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        ignore_throttled: import("@kbn/config-schema").Type<boolean | undefined>;
        failure_store: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const basicChartSchema: {
    indexPatternTitle: import("@kbn/config-schema").Type<string>;
    timeField: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
    intervalMs: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").AnyType;
    aggFieldNamePairs: import("@kbn/config-schema").Type<any[]>;
    splitFieldName: import("@kbn/config-schema").Type<string | null>;
    splitFieldValue: import("@kbn/config-schema").Type<string | null>;
    runtimeMappings: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    indicesOptions: import("@kbn/config-schema").Type<Readonly<{
        allow_no_indices?: boolean | undefined;
        expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
        ignore_throttled?: boolean | undefined;
        ignore_unavailable?: boolean | undefined;
        failure_store?: string | undefined;
    } & {}> | undefined>;
};
export declare const populationChartSchema: {
    indexPatternTitle: import("@kbn/config-schema").Type<string>;
    timeField: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
    intervalMs: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").AnyType;
    aggFieldNamePairs: import("@kbn/config-schema").Type<any[]>;
    splitFieldName: import("@kbn/config-schema").Type<string | null>;
    splitFieldValue: import("@kbn/config-schema").Type<string | null | undefined>;
    runtimeMappings: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    indicesOptions: import("@kbn/config-schema").Type<Readonly<{
        allow_no_indices?: boolean | undefined;
        expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
        ignore_throttled?: boolean | undefined;
        ignore_unavailable?: boolean | undefined;
        failure_store?: string | undefined;
    } & {}> | undefined>;
};
export declare const forceStartDatafeedSchema: import("@kbn/config-schema").ObjectType<{
    datafeedIds: import("@kbn/config-schema").Type<string[]>;
    start: import("@kbn/config-schema").Type<number | undefined>;
    end: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const jobIdsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const deleteJobsSchema: import("@kbn/config-schema").ObjectType<{
    deleteUserAnnotations: import("@kbn/config-schema").Type<boolean | undefined>;
    deleteAlertingRules: import("@kbn/config-schema").Type<boolean | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const stopDatafeedsSchema: import("@kbn/config-schema").ObjectType<{
    datafeedIds: import("@kbn/config-schema").Type<string[]>;
    closeJobs: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const optionalJobIdsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const lookBackProgressSchema: {
    jobId: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
};
export declare const topCategoriesSchema: {
    jobId: import("@kbn/config-schema").Type<string>;
    count: import("@kbn/config-schema").Type<number>;
};
export declare const updateGroupsSchema: import("@kbn/config-schema").ObjectType<{
    jobs: import("@kbn/config-schema").Type<Readonly<{} & {
        groups: string[];
        jobId: string;
    }>[]>;
}>;
export declare const revertModelSnapshotSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    snapshotId: import("@kbn/config-schema").Type<string>;
    replay: import("@kbn/config-schema").Type<boolean>;
    end: import("@kbn/config-schema").Type<number | undefined>;
    deleteInterveningResults: import("@kbn/config-schema").Type<boolean | undefined>;
    calendarEvents: import("@kbn/config-schema").Type<Readonly<{} & {
        start: number;
        end: number;
        description: string;
    }>[] | undefined>;
}>;
export declare const datafeedPreviewSchema: import("@kbn/config-schema").ObjectType<{
    job: import("@kbn/config-schema").Type<Readonly<{
        state?: string | undefined;
        description?: string | undefined;
        groups?: (string | undefined)[] | undefined;
        job_id?: string | undefined;
        model_size_stats?: any;
        create_time?: number | undefined;
        data_counts?: any;
        datafeed_config?: Readonly<{
            indices?: string[] | undefined;
            query?: any;
            aggregations?: any;
            frequency?: string | undefined;
            aggs?: any;
            script_fields?: any;
            runtime_mappings?: any;
            scroll_size?: number | undefined;
            job_id?: string | undefined;
            datafeed_id?: string | undefined;
            indexes?: string[] | undefined;
            chunking_config?: Readonly<{
                time_span?: string | number | undefined;
            } & {
                mode: "off" | "auto" | "manual";
            }> | undefined;
            max_empty_searches?: number | undefined;
            query_delay?: string | undefined;
            delayed_data_check_config?: any;
            indices_options?: Readonly<{
                allow_no_indices?: boolean | undefined;
                expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
                ignore_throttled?: boolean | undefined;
                ignore_unavailable?: boolean | undefined;
                failure_store?: string | undefined;
            } & {}> | undefined;
            feed_id?: string | undefined;
        } & {}> | undefined;
        allow_lazy_open?: any;
        analysis_limits?: Readonly<{
            categorization_examples_limit?: number | undefined;
        } & {
            model_memory_limit: string;
        }> | undefined;
        background_persist_interval?: string | undefined;
        custom_settings?: Readonly<{
            created_by?: string | undefined;
            custom_urls?: (Readonly<{
                time_range?: any;
            } & {
                url_name: string;
                url_value: string;
            }> | undefined)[] | undefined;
        } & {}> | undefined;
        daily_model_snapshot_retention_after_days?: number | undefined;
        model_plot_config?: any;
        model_snapshot_retention_days?: number | undefined;
        renormalization_window_days?: number | undefined;
        results_index_name?: string | undefined;
        results_retention_days?: number | undefined;
        model_plot?: any;
        model_snapshot_id?: string | undefined;
        finished_time?: number | undefined;
        job_type?: string | undefined;
        job_version?: string | undefined;
        established_model_memory?: number | undefined;
        model_snapshot_min_version?: string | undefined;
    } & {
        analysis_config: Readonly<{
            categorization_analyzer?: any;
            latency?: number | undefined;
            categorization_filters?: string[] | undefined;
            model_prune_window?: string | undefined;
            per_partition_categorization?: Readonly<{
                stop_on_warn?: boolean | undefined;
            } & {
                enabled: boolean;
            }> | undefined;
            summary_count_field_name?: string | undefined;
            categorization_field_name?: string | undefined;
            multivariate_by_fields?: boolean | undefined;
        } & {
            bucket_span: string;
            influencers: string[];
            detectors: Readonly<{
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
            }>[];
        }>;
        data_description: Readonly<{
            format?: string | undefined;
            time_format?: string | undefined;
        } & {
            time_field: string;
        }>;
    }> | undefined>;
    datafeed: import("@kbn/config-schema").Type<Readonly<{
        indices?: string[] | undefined;
        query?: any;
        aggregations?: any;
        frequency?: string | undefined;
        aggs?: any;
        script_fields?: any;
        runtime_mappings?: any;
        scroll_size?: number | undefined;
        job_id?: string | undefined;
        datafeed_id?: string | undefined;
        indexes?: string[] | undefined;
        chunking_config?: Readonly<{
            time_span?: string | number | undefined;
        } & {
            mode: "off" | "auto" | "manual";
        }> | undefined;
        max_empty_searches?: number | undefined;
        query_delay?: string | undefined;
        delayed_data_check_config?: any;
        indices_options?: Readonly<{
            allow_no_indices?: boolean | undefined;
            expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
            ignore_throttled?: boolean | undefined;
            ignore_unavailable?: boolean | undefined;
            failure_store?: string | undefined;
        } & {}> | undefined;
        feed_id?: string | undefined;
    } & {}> | undefined>;
    datafeedId: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const jobsExistSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    allSpaces: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const bulkCreateSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    datafeed: Readonly<{
        indices?: string[] | undefined;
        query?: any;
        aggregations?: any;
        frequency?: string | undefined;
        aggs?: any;
        script_fields?: any;
        runtime_mappings?: any;
        scroll_size?: number | undefined;
        job_id?: string | undefined;
        datafeed_id?: string | undefined;
        indexes?: string[] | undefined;
        chunking_config?: Readonly<{
            time_span?: string | number | undefined;
        } & {
            mode: "off" | "auto" | "manual";
        }> | undefined;
        max_empty_searches?: number | undefined;
        query_delay?: string | undefined;
        delayed_data_check_config?: any;
        indices_options?: Readonly<{
            allow_no_indices?: boolean | undefined;
            expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
            ignore_throttled?: boolean | undefined;
            ignore_unavailable?: boolean | undefined;
            failure_store?: string | undefined;
        } & {}> | undefined;
        feed_id?: string | undefined;
    } & {}>;
    job: Readonly<{
        state?: string | undefined;
        description?: string | undefined;
        groups?: (string | undefined)[] | undefined;
        job_id?: string | undefined;
        model_size_stats?: any;
        create_time?: number | undefined;
        data_counts?: any;
        datafeed_config?: Readonly<{
            indices?: string[] | undefined;
            query?: any;
            aggregations?: any;
            frequency?: string | undefined;
            aggs?: any;
            script_fields?: any;
            runtime_mappings?: any;
            scroll_size?: number | undefined;
            job_id?: string | undefined;
            datafeed_id?: string | undefined;
            indexes?: string[] | undefined;
            chunking_config?: Readonly<{
                time_span?: string | number | undefined;
            } & {
                mode: "off" | "auto" | "manual";
            }> | undefined;
            max_empty_searches?: number | undefined;
            query_delay?: string | undefined;
            delayed_data_check_config?: any;
            indices_options?: Readonly<{
                allow_no_indices?: boolean | undefined;
                expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
                ignore_throttled?: boolean | undefined;
                ignore_unavailable?: boolean | undefined;
                failure_store?: string | undefined;
            } & {}> | undefined;
            feed_id?: string | undefined;
        } & {}> | undefined;
        allow_lazy_open?: any;
        analysis_limits?: Readonly<{
            categorization_examples_limit?: number | undefined;
        } & {
            model_memory_limit: string;
        }> | undefined;
        background_persist_interval?: string | undefined;
        custom_settings?: Readonly<{
            created_by?: string | undefined;
            custom_urls?: (Readonly<{
                time_range?: any;
            } & {
                url_name: string;
                url_value: string;
            }> | undefined)[] | undefined;
        } & {}> | undefined;
        daily_model_snapshot_retention_after_days?: number | undefined;
        model_plot_config?: any;
        model_snapshot_retention_days?: number | undefined;
        renormalization_window_days?: number | undefined;
        results_index_name?: string | undefined;
        results_retention_days?: number | undefined;
        model_plot?: any;
        model_snapshot_id?: string | undefined;
        finished_time?: number | undefined;
        job_type?: string | undefined;
        job_version?: string | undefined;
        established_model_memory?: number | undefined;
        model_snapshot_min_version?: string | undefined;
    } & {
        analysis_config: Readonly<{
            categorization_analyzer?: any;
            latency?: number | undefined;
            categorization_filters?: string[] | undefined;
            model_prune_window?: string | undefined;
            per_partition_categorization?: Readonly<{
                stop_on_warn?: boolean | undefined;
            } & {
                enabled: boolean;
            }> | undefined;
            summary_count_field_name?: string | undefined;
            categorization_field_name?: string | undefined;
            multivariate_by_fields?: boolean | undefined;
        } & {
            bucket_span: string;
            influencers: string[];
            detectors: Readonly<{
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
            }>[];
        }>;
        data_description: Readonly<{
            format?: string | undefined;
            time_format?: string | undefined;
        } & {
            time_field: string;
        }>;
    }>;
}>[] | Readonly<{} & {
    datafeed: Readonly<{
        indices?: string[] | undefined;
        query?: any;
        aggregations?: any;
        frequency?: string | undefined;
        aggs?: any;
        script_fields?: any;
        runtime_mappings?: any;
        scroll_size?: number | undefined;
        job_id?: string | undefined;
        datafeed_id?: string | undefined;
        indexes?: string[] | undefined;
        chunking_config?: Readonly<{
            time_span?: string | number | undefined;
        } & {
            mode: "off" | "auto" | "manual";
        }> | undefined;
        max_empty_searches?: number | undefined;
        query_delay?: string | undefined;
        delayed_data_check_config?: any;
        indices_options?: Readonly<{
            allow_no_indices?: boolean | undefined;
            expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
            ignore_throttled?: boolean | undefined;
            ignore_unavailable?: boolean | undefined;
            failure_store?: string | undefined;
        } & {}> | undefined;
        feed_id?: string | undefined;
    } & {}>;
    job: Readonly<{
        state?: string | undefined;
        description?: string | undefined;
        groups?: (string | undefined)[] | undefined;
        job_id?: string | undefined;
        model_size_stats?: any;
        create_time?: number | undefined;
        data_counts?: any;
        datafeed_config?: Readonly<{
            indices?: string[] | undefined;
            query?: any;
            aggregations?: any;
            frequency?: string | undefined;
            aggs?: any;
            script_fields?: any;
            runtime_mappings?: any;
            scroll_size?: number | undefined;
            job_id?: string | undefined;
            datafeed_id?: string | undefined;
            indexes?: string[] | undefined;
            chunking_config?: Readonly<{
                time_span?: string | number | undefined;
            } & {
                mode: "off" | "auto" | "manual";
            }> | undefined;
            max_empty_searches?: number | undefined;
            query_delay?: string | undefined;
            delayed_data_check_config?: any;
            indices_options?: Readonly<{
                allow_no_indices?: boolean | undefined;
                expand_wildcards?: ("all" | "none" | "closed" | "hidden" | "open")[] | undefined;
                ignore_throttled?: boolean | undefined;
                ignore_unavailable?: boolean | undefined;
                failure_store?: string | undefined;
            } & {}> | undefined;
            feed_id?: string | undefined;
        } & {}> | undefined;
        allow_lazy_open?: any;
        analysis_limits?: Readonly<{
            categorization_examples_limit?: number | undefined;
        } & {
            model_memory_limit: string;
        }> | undefined;
        background_persist_interval?: string | undefined;
        custom_settings?: Readonly<{
            created_by?: string | undefined;
            custom_urls?: (Readonly<{
                time_range?: any;
            } & {
                url_name: string;
                url_value: string;
            }> | undefined)[] | undefined;
        } & {}> | undefined;
        daily_model_snapshot_retention_after_days?: number | undefined;
        model_plot_config?: any;
        model_snapshot_retention_days?: number | undefined;
        renormalization_window_days?: number | undefined;
        results_index_name?: string | undefined;
        results_retention_days?: number | undefined;
        model_plot?: any;
        model_snapshot_id?: string | undefined;
        finished_time?: number | undefined;
        job_type?: string | undefined;
        job_version?: string | undefined;
        established_model_memory?: number | undefined;
        model_snapshot_min_version?: string | undefined;
    } & {
        analysis_config: Readonly<{
            categorization_analyzer?: any;
            latency?: number | undefined;
            categorization_filters?: string[] | undefined;
            model_prune_window?: string | undefined;
            per_partition_categorization?: Readonly<{
                stop_on_warn?: boolean | undefined;
            } & {
                enabled: boolean;
            }> | undefined;
            summary_count_field_name?: string | undefined;
            categorization_field_name?: string | undefined;
            multivariate_by_fields?: boolean | undefined;
        } & {
            bucket_span: string;
            influencers: string[];
            detectors: Readonly<{
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
            }>[];
        }>;
        data_description: Readonly<{
            format?: string | undefined;
            time_format?: string | undefined;
        } & {
            time_field: string;
        }>;
    }>;
}>>;
