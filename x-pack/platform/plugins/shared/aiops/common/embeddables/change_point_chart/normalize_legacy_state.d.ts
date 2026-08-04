import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
export interface LegacyChangePointChartFields {
    fn?: ChangePointChartEmbeddableState['aggregation_function'];
    viewType?: ChangePointChartEmbeddableState['view_type'];
    dataViewId?: string;
    metricField?: string;
    splitField?: string;
    maxSeriesToPlot?: number;
}
export type RawChangePointChartState = Partial<ChangePointChartEmbeddableState> & LegacyChangePointChartFields;
interface NormalizedChangePointChartFields {
    aggregation_function: ChangePointChartEmbeddableState['aggregation_function'];
    view_type: ChangePointChartEmbeddableState['view_type'];
    data_view_id: string | undefined;
    metric_field: string | undefined;
    split_field: string | undefined;
    partitions: string[] | undefined;
    max_series_to_plot: number;
}
export declare const normalizeChangePointChartLegacyFields: (state: RawChangePointChartState) => NormalizedChangePointChartFields;
export {};
