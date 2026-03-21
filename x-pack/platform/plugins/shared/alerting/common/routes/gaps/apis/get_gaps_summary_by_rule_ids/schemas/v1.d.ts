export declare const getGapsSummaryByRuleIdsBodySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<string>;
    rule_ids: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const getGapsSummaryByRuleIdsResponseSchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{
        gap_fill_status?: string | undefined;
    } & {
        rule_id: string;
        total_unfilled_duration_ms: number;
        total_in_progress_duration_ms: number;
        total_filled_duration_ms: number;
    }>[]>;
}>;
