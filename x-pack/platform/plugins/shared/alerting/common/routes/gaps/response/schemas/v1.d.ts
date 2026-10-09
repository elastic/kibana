export declare const gapStatusSchema: import("@kbn/config-schema").Type<"filled" | "partially_filled" | "unfilled">;
export declare const rangeSchema: import("@kbn/config-schema").ObjectType<{
    lte: import("@kbn/config-schema").Type<string>;
    gte: import("@kbn/config-schema").Type<string>;
}>;
export declare const rangeListSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    lte: string;
    gte: string;
}>[]>;
export declare const gapsResponseSchema: import("@kbn/config-schema").ObjectType<{
    '@timestamp': import("@kbn/config-schema").Type<string>;
    _id: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"filled" | "partially_filled" | "unfilled">;
    range: import("@kbn/config-schema").ObjectType<{
        lte: import("@kbn/config-schema").Type<string>;
        gte: import("@kbn/config-schema").Type<string>;
    }>;
    in_progress_intervals: import("@kbn/config-schema").Type<Readonly<{} & {
        lte: string;
        gte: string;
    }>[]>;
    filled_intervals: import("@kbn/config-schema").Type<Readonly<{} & {
        lte: string;
        gte: string;
    }>[]>;
    unfilled_intervals: import("@kbn/config-schema").Type<Readonly<{} & {
        lte: string;
        gte: string;
    }>[]>;
    total_gap_duration_ms: import("@kbn/config-schema").Type<number>;
    filled_duration_ms: import("@kbn/config-schema").Type<number>;
    unfilled_duration_ms: import("@kbn/config-schema").Type<number>;
    in_progress_duration_ms: import("@kbn/config-schema").Type<number>;
    updated_at: import("@kbn/config-schema").Type<string | undefined>;
    failed_auto_fill_attempts: import("@kbn/config-schema").Type<number | undefined>;
    reason: import("@kbn/config-schema").Type<Readonly<{} & {
        type: "rule_did_not_run" | "rule_disabled";
    }> | undefined>;
}>;
export declare const errorResponseSchema: import("@kbn/config-schema").ObjectType<{
    error: import("@kbn/config-schema").ObjectType<{
        message: import("@kbn/config-schema").Type<string>;
        status: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
