export declare const startDatafeedSchema: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string | number | undefined>;
    end: import("@kbn/config-schema").Type<string | number | undefined>;
    timeout: import("@kbn/config-schema").Type<any>;
}>;
export declare const indicesOptionsSchema: import("@kbn/config-schema").ObjectType<{
    expand_wildcards: import("@kbn/config-schema").Type<("all" | "none" | "closed" | "hidden" | "open")[] | undefined>;
    ignore_unavailable: import("@kbn/config-schema").Type<boolean | undefined>;
    allow_no_indices: import("@kbn/config-schema").Type<boolean | undefined>;
    ignore_throttled: import("@kbn/config-schema").Type<boolean | undefined>;
    failure_store: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const datafeedConfigSchema: import("@kbn/config-schema").ObjectType<{
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
export declare const datafeedIdSchema: import("@kbn/config-schema").ObjectType<{
    datafeedId: import("@kbn/config-schema").Type<string>;
}>;
export declare const deleteDatafeedQuerySchema: import("@kbn/config-schema").ObjectType<{
    force: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
