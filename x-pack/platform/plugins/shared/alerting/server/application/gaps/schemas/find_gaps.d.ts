export declare const findGapsParamsSchema: import("@kbn/config-schema").ObjectType<Omit<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    sortField: import("@kbn/config-schema").Type<"@timestamp" | "kibana.alert.rule.gap.status" | "kibana.alert.rule.gap.total_gap_duration_ms" | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
    statuses: import("@kbn/config-schema").Type<("unfilled" | "filled" | "partially_filled")[] | undefined>;
    hasUnfilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasInProgressIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasFilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
}, "page" | "ruleId"> & {
    page: import("@kbn/config-schema").Type<number>;
    ruleId: import("@kbn/config-schema").Type<string>;
}>;
export declare const findGapsByIdParamsSchema: import("@kbn/config-schema").ObjectType<{
    gapIds: import("@kbn/config-schema").Type<string[]>;
    ruleId: import("@kbn/config-schema").Type<string>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
}>;
export declare const findGapsSearchAfterParamsSchema: import("@kbn/config-schema").ObjectType<Omit<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    sortField: import("@kbn/config-schema").Type<"@timestamp" | "kibana.alert.rule.gap.status" | "kibana.alert.rule.gap.total_gap_duration_ms" | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
    statuses: import("@kbn/config-schema").Type<("unfilled" | "filled" | "partially_filled")[] | undefined>;
    hasUnfilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasInProgressIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasFilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
}, "searchAfter" | "ruleIds" | "pitId" | "updatedBefore" | "failedAutoFillAttemptsLessThan"> & {
    searchAfter: import("@kbn/config-schema").Type<any[] | undefined>;
    ruleIds: import("@kbn/config-schema").Type<string[]>;
    pitId: import("@kbn/config-schema").Type<string | undefined>;
    updatedBefore: import("@kbn/config-schema").Type<string | undefined>;
    failedAutoFillAttemptsLessThan: import("@kbn/config-schema").Type<number | undefined>;
}>;
