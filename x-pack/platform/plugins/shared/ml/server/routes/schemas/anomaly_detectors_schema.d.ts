export declare const anomalyDetectionUpdateJobSchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    detectors: import("@kbn/config-schema").Type<(Readonly<{
        description?: string | undefined;
        custom_rules?: Readonly<{
            params?: any;
            scope?: any;
            conditions?: any[] | undefined;
        } & {
            actions: ("skip_model_update" | "skip_result" | "force_time_shift")[];
        }>[] | undefined;
    } & {
        detector_index: number;
    }> | undefined)[] | undefined>;
    custom_settings: import("@kbn/config-schema").Type<Readonly<{
        created_by?: string | undefined;
        custom_urls?: (Readonly<{
            time_range?: any;
        } & {
            url_name: string;
            url_value: string;
        }> | undefined)[] | undefined;
    } & {}> | undefined>;
    analysis_limits: import("@kbn/config-schema").Type<Readonly<{
        categorization_examples_limit?: number | undefined;
    } & {
        model_memory_limit: string;
    }> | undefined>;
    groups: import("@kbn/config-schema").Type<string[] | undefined>;
    model_snapshot_retention_days: import("@kbn/config-schema").Type<number | undefined>;
    daily_model_snapshot_retention_after_days: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const analysisConfigSchema: import("@kbn/config-schema").ObjectType<{
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
export declare const anomalyDetectionJobSchema: {
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
    datafeed_config: import("@kbn/config-schema").Type<Readonly<{
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
};
export declare const jobIdSchemaBasic: {
    jobId: import("@kbn/config-schema").Type<string>;
};
export declare const jobIdSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
}>;
export declare const deleteForecastSchema: import("@kbn/config-schema").ObjectType<{
    forecastId: import("@kbn/config-schema").Type<string>;
    jobId: import("@kbn/config-schema").Type<string>;
}>;
export declare const getBucketsSchema: import("@kbn/config-schema").ObjectType<{
    anomaly_score: import("@kbn/config-schema").Type<number | undefined>;
    desc: import("@kbn/config-schema").Type<boolean | undefined>;
    end: import("@kbn/config-schema").Type<string | undefined>;
    exclude_interim: import("@kbn/config-schema").Type<boolean | undefined>;
    expand: import("@kbn/config-schema").Type<boolean | undefined>;
    page: import("@kbn/config-schema").Type<Readonly<{} & {
        from: number;
        size: number;
    }> | undefined>;
    sort: import("@kbn/config-schema").Type<string | undefined>;
    start: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getBucketParamsSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    timestamp: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getOverallBucketsSchema: import("@kbn/config-schema").ObjectType<{
    topN: import("@kbn/config-schema").Type<number>;
    bucketSpan: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
    overall_score: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const getCategoriesSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    categoryId: import("@kbn/config-schema").Type<string>;
}>;
export declare const getModelSnapshotsSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    snapshotId: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const updateModelSnapshotsSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    snapshotId: import("@kbn/config-schema").Type<string>;
}>;
export declare const updateModelSnapshotBodySchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    retain: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const forecastAnomalyDetector: import("@kbn/config-schema").ObjectType<{
    duration: import("@kbn/config-schema").AnyType;
    expires_in: import("@kbn/config-schema").Type<any>;
}>;
export declare const forceQuerySchema: import("@kbn/config-schema").ObjectType<{
    force: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const jobForCloningSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    retainCreatedBy: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const getAnomalyDetectorsResponse: () => import("@kbn/config-schema").ObjectType<{
    count: import("@kbn/config-schema").Type<number>;
    jobs: import("@kbn/config-schema").Type<any[]>;
}>;
