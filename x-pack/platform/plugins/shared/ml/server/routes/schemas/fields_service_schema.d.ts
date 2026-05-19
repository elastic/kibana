export declare const getCardinalityOfFieldsSchema: import("@kbn/config-schema").ObjectType<{
    earliestMs: import("@kbn/config-schema").Type<string | number | undefined>;
    latestMs: import("@kbn/config-schema").Type<string | number | undefined>;
    timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<any>;
    fieldNames: import("@kbn/config-schema").Type<string[] | undefined>;
    index: import("@kbn/config-schema").Type<string | string[]>;
}>;
export declare const getTimeFieldRangeSchema: import("@kbn/config-schema").ObjectType<{
    runtimeMappings: import("@kbn/config-schema").ObjectType<{}>;
    indicesOptions: import("@kbn/config-schema").ObjectType<{
        expand_wildcards: import("@kbn/config-schema").Type<("all" | "none" | "closed" | "hidden" | "open")[] | undefined>;
        ignore_unavailable: import("@kbn/config-schema").Type<boolean | undefined>;
        allow_no_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        ignore_throttled: import("@kbn/config-schema").Type<boolean | undefined>;
        failure_store: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    allowFutureTime: import("@kbn/config-schema").Type<boolean | undefined>;
    projectRouting: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<any>;
    timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
    index: import("@kbn/config-schema").Type<string | string[]>;
}>;
export declare const getCardinalityOfFieldsResponse: () => import("@kbn/config-schema").Type<Record<string, number>>;
export declare const getTimeFieldRangeResponse: () => import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
    success: import("@kbn/config-schema").Type<boolean>;
}>;
