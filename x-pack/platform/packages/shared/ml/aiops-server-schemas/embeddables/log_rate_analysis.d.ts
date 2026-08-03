import { type TypeOf } from '@kbn/config-schema';
export declare const logRateAnalysisEmbeddableStateSchema: import("@kbn/config-schema").ObjectType<{
    data_view_id: import("@kbn/config-schema").Type<string>;
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
export type LogRateAnalysisEmbeddableState = TypeOf<typeof logRateAnalysisEmbeddableStateSchema>;
