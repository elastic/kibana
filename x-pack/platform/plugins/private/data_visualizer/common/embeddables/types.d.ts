import type { FieldStatsTableEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
export declare enum FieldStatsInitializerViewType {
    DATA_VIEW = "dataview",
    ESQL = "esql"
}
type DistributiveOmit<T, K extends PropertyKey> = T extends T ? Omit<T, K> : never;
export type StoredFieldStatisticsTableEmbeddableState = DistributiveOmit<FieldStatsTableEmbeddableState, 'data_view_id'>;
export interface FieldStatsInitialState {
    view_type?: FieldStatsTableEmbeddableState['view_type'];
    data_view_id?: string;
    query?: {
        esql: string;
    };
    show_distributions?: boolean;
}
export {};
