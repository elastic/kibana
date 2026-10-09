declare enum Comparator {
    GT = "more than",
    GT_OR_EQ = "more than or equals",
    LT = "less than",
    LT_OR_EQ = "less than or equals",
    EQ = "equals",
    NOT_EQ = "does not equal",
    MATCH = "matches",
    NOT_MATCH = "does not match",
    MATCH_PHRASE = "matches phrase",
    NOT_MATCH_PHRASE = "does not match phrase"
}
export declare const logThresholdParamsSchema: import("@kbn/config-schema").Type<Readonly<{
    groupBy?: string[] | undefined;
} & {
    criteria: Readonly<{} & {
        field: string;
        comparator: Comparator;
        value: string | number;
    }>[];
    count: Readonly<{} & {
        comparator: Comparator;
        value: number;
    }>;
    timeUnit: "d" | "h" | "m" | "s";
    timeSize: number;
    logView: Readonly<{} & {
        logViewId: string;
        type: "log-view-reference";
    }>;
}> | Readonly<{
    groupBy?: string[] | undefined;
} & {
    criteria: Readonly<{} & {
        field: string;
        comparator: Comparator;
        value: string | number;
    }>[][];
    count: Readonly<{} & {
        comparator: Comparator;
        value: number;
    }>;
    timeUnit: "d" | "h" | "m" | "s";
    timeSize: number;
    logView: Readonly<{} & {
        logViewId: string;
        type: "log-view-reference";
    }>;
}>>;
export type LogThresholdParams = ReturnType<typeof logThresholdParamsSchema.validate>;
export {};
