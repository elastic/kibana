import type { FieldStatsTableEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
export interface LegacyFieldStatsFields {
    viewType?: FieldStatsTableEmbeddableState['view_type'];
    showDistributions?: boolean;
    dataViewId?: string;
}
type FieldStatsEsqlState = Extract<FieldStatsTableEmbeddableState, {
    view_type: 'esql';
}>;
type FieldStatsDataViewState = Extract<FieldStatsTableEmbeddableState, {
    view_type: 'dataview';
}>;
type PartialFieldStatsState = Partial<FieldStatsTableEmbeddableState & Pick<FieldStatsEsqlState, 'query'> & Pick<FieldStatsDataViewState, 'data_view_id'>>;
export type RawFieldStatsState = PartialFieldStatsState & LegacyFieldStatsFields;
export type NormalizedFieldStatsFields = {
    view_type: 'dataview';
    data_view_id: string;
    show_distributions: boolean;
} | {
    view_type: 'esql';
    query: {
        esql: string;
    };
    show_distributions: boolean;
};
export declare const normalizeFieldStatsLegacyFields: (state: RawFieldStatsState) => NormalizedFieldStatsFields;
export {};
