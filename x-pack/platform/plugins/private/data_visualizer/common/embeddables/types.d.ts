import type { AggregateQuery } from '@kbn/es-query';
import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
export declare enum FieldStatsInitializerViewType {
    DATA_VIEW = "dataview",
    ESQL = "esql"
}
export interface FieldStatsInitialState {
    dataViewId?: string;
    viewType?: FieldStatsInitializerViewType;
    query?: AggregateQuery;
    showDistributions?: boolean;
}
export type FieldStatisticsTableEmbeddableState = FieldStatsInitialState & SerializedTitles & SerializedTimeRange & {};
export type StoredFieldStatisticsTableEmbeddableState = Omit<FieldStatisticsTableEmbeddableState, 'dataViewId'>;
