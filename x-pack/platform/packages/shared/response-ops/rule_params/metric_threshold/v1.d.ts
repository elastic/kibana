export declare const metricThresholdRuleParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<(Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        threshold: number[];
        label: never;
        metric: never;
        comparator: string;
        customMetrics: never;
        timeUnit: string;
        aggType: "count";
        timeSize: number;
        equation: never;
    }> | Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        threshold: number[];
        label: never;
        metric: string;
        comparator: string;
        customMetrics: never;
        timeUnit: string;
        aggType: string;
        timeSize: number;
        equation: never;
    }> | Readonly<{
        label?: string | undefined;
        equation?: string | undefined;
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        threshold: number[];
        metric: never;
        comparator: string;
        customMetrics: (Readonly<{} & {
            name: string;
            filter: never;
            field: string;
            aggType: string;
        }> | Readonly<{
            filter?: string | undefined;
        } & {
            name: string;
            field: never;
            aggType: "count";
        }>)[];
        timeUnit: string;
        aggType: "custom";
        timeSize: number;
    }>)[]>;
    groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
    filterQuery: import("@kbn/config-schema").Type<string | undefined>;
    sourceId: import("@kbn/config-schema").Type<string>;
    alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
    alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
