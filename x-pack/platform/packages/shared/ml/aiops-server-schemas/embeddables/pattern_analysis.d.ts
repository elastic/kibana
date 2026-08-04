import { type TypeOf } from '@kbn/config-schema';
export declare const patternAnalysisEmbeddableStateSchema: import("@kbn/config-schema").ObjectType<{
    data_view_id: import("@kbn/config-schema").Type<string>;
    field_name: import("@kbn/config-schema").Type<string>;
    minimum_time_range: import("@kbn/config-schema").Type<"no_minimum" | "1_week" | "1_month" | "3_months" | "6_months">;
    random_sampler_mode: import("@kbn/config-schema").Type<"off" | "on_automatic" | "on_manual">;
    random_sampler_probability: import("@kbn/config-schema").Type<number | null>;
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
export type PatternAnalysisEmbeddableState = TypeOf<typeof patternAnalysisEmbeddableStateSchema>;
