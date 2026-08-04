export declare const metricThresholdRuleParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<(Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        label: never;
        aggType: "count";
        metric: never;
        threshold: number[];
        equation: never;
        comparator: string;
        customMetrics: never;
        timeUnit: string;
        timeSize: number;
    }> | Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        label: never;
        aggType: string;
        metric: string;
        threshold: number[];
        equation: never;
        comparator: string;
        customMetrics: never;
        timeUnit: string;
        timeSize: number;
    }> | Readonly<{
        label?: string | undefined;
        equation?: string | undefined;
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        aggType: "custom";
        metric: never;
        threshold: number[];
        comparator: string;
        customMetrics: (Readonly<{} & {
            filter: never;
            field: string;
            name: string;
            aggType: string;
        }> | Readonly<{
            filter?: string | undefined;
        } & {
            field: never;
            name: string;
            aggType: "count";
        }>)[];
        timeUnit: string;
        timeSize: number;
    }>)[]>;
    groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
    filterQuery: import("@kbn/config-schema").Type<string | undefined>;
    sourceId: import("@kbn/config-schema").Type<string>;
    alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
    alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
