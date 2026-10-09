export declare const findGapsBodySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    rule_id: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<string>;
    sort_field: import("@kbn/config-schema").Type<"@timestamp" | "kibana.alert.rule.gap.status" | "kibana.alert.rule.gap.total_gap_duration_ms" | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    statuses: import("@kbn/config-schema").Type<("filled" | "partially_filled" | "unfilled")[] | undefined>;
    excluded_reasons: import("@kbn/config-schema").Type<("rule_did_not_run" | "rule_disabled")[] | undefined>;
}>;
export declare const findGapsResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        updated_at?: string | undefined;
        failed_auto_fill_attempts?: number | undefined;
        reason?: Readonly<{} & {
            type: "rule_did_not_run" | "rule_disabled";
        }> | undefined;
    } & {
        '@timestamp': string;
        _id: string;
        status: "filled" | "partially_filled" | "unfilled";
        range: Readonly<{} & {
            lte: string;
            gte: string;
        }>;
        in_progress_intervals: Readonly<{} & {
            lte: string;
            gte: string;
        }>[];
        filled_intervals: Readonly<{} & {
            lte: string;
            gte: string;
        }>[];
        unfilled_intervals: Readonly<{} & {
            lte: string;
            gte: string;
        }>[];
        total_gap_duration_ms: number;
        filled_duration_ms: number;
        unfilled_duration_ms: number;
        in_progress_duration_ms: number;
    }>[]>;
}>;
