export declare const findGapsParamsSchema: import("@kbn/config-schema").ObjectType<Omit<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    sortField: import("@kbn/config-schema").Type<"@timestamp" | "kibana.alert.rule.gap.status" | "kibana.alert.rule.gap.total_gap_duration_ms" | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    statuses: import("@kbn/config-schema").Type<("filled" | "unfilled" | "partially_filled")[] | undefined>;
    hasUnfilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasInProgressIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasFilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    excludedReasons: import("@kbn/config-schema").Type<("rule_disabled" | "rule_did_not_run")[] | undefined>;
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
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    statuses: import("@kbn/config-schema").Type<("filled" | "unfilled" | "partially_filled")[] | undefined>;
    hasUnfilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasInProgressIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    hasFilledIntervals: import("@kbn/config-schema").Type<boolean | undefined>;
    excludedReasons: import("@kbn/config-schema").Type<("rule_disabled" | "rule_did_not_run")[] | undefined>;
}, "searchAfter" | "pitId" | "ruleIds" | "updatedBefore" | "failedAutoFillAttemptsLessThan"> & {
    searchAfter: import("@kbn/config-schema").Type<any[] | undefined>;
    pitId: import("@kbn/config-schema").Type<string | undefined>;
    ruleIds: import("@kbn/config-schema").Type<string[]>;
    updatedBefore: import("@kbn/config-schema").Type<string | undefined>;
    failedAutoFillAttemptsLessThan: import("@kbn/config-schema").Type<number | undefined>;
}>;
