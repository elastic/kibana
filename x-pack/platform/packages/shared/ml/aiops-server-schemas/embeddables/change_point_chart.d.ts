import { type TypeOf } from '@kbn/config-schema';
declare const aggregationFunctionSchema: import("@kbn/config-schema").Type<"avg" | "max" | "min" | "sum">;
export declare const changePointChartEmbeddableStateSchema: import("@kbn/config-schema").ObjectType<{
    data_view_id: import("@kbn/config-schema").Type<string>;
    view_type: import("@kbn/config-schema").Type<"table" | "charts">;
    aggregation_function: import("@kbn/config-schema").Type<"avg" | "max" | "min" | "sum">;
    metric_field: import("@kbn/config-schema").Type<string>;
    split_field: import("@kbn/config-schema").Type<string | undefined>;
    partitions: import("@kbn/config-schema").Type<string[] | undefined>;
    max_series_to_plot: import("@kbn/config-schema").Type<number>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export type ChangePointChartEmbeddableState = TypeOf<typeof changePointChartEmbeddableStateSchema>;
export type ChangePointAggregationFunction = TypeOf<typeof aggregationFunctionSchema>;
export {};
