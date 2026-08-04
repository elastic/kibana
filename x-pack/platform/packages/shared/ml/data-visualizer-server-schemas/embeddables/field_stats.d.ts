import { type TypeOf } from '@kbn/config-schema';
export declare const fieldStatsTableEmbeddableSchema: import("@kbn/config-schema").Type<Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
} & {
    data_view_id: string;
    view_type: "dataview";
    show_distributions: boolean;
}> | Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
} & {
    query: Readonly<{} & {
        esql: string;
    }>;
    view_type: "esql";
    show_distributions: boolean;
}>>;
export type FieldStatsTableEmbeddableState = TypeOf<typeof fieldStatsTableEmbeddableSchema>;
