export declare const metricThresholdRuleParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<(Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        threshold: number[];
        comparator: string;
        timeUnit: string;
        timeSize: number;
        aggType: "count";
        metric: never;
        customMetrics: never;
        equation: never;
        label: never;
    }> | Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        threshold: number[];
        comparator: string;
        timeUnit: string;
        timeSize: number;
        metric: string;
        aggType: string;
        customMetrics: never;
        equation: never;
        label: never;
    }> | Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
        equation?: string | undefined;
        label?: string | undefined;
    } & {
        threshold: number[];
        comparator: string;
        timeUnit: string;
        timeSize: number;
        aggType: "custom";
        metric: never;
        customMetrics: (Readonly<{} & {
            name: string;
            aggType: string;
            field: string;
            filter: never;
        }> | Readonly<{
            filter?: string | undefined;
        } & {
            name: string;
            aggType: "count";
            field: never;
        }>)[];
    }>)[]>;
    groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
    filterQuery: import("@kbn/config-schema").Type<string | undefined>;
    sourceId: import("@kbn/config-schema").Type<string>;
    alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
    alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
