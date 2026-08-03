import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasEditCapabilities, PublishesDataViews, PublishesTimeRange, PublishingSubject } from '@kbn/presentation-publishing';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
export type ChangePointEmbeddableCustomState = Omit<ChangePointChartEmbeddableState, 'time_range' | 'title' | 'description' | 'hide_title' | 'hide_border'>;
export interface ChangePointComponentApi {
    viewType: PublishingSubject<ChangePointChartEmbeddableState['view_type']>;
    dataViewId: PublishingSubject<ChangePointChartEmbeddableState['data_view_id']>;
    fn: PublishingSubject<ChangePointChartEmbeddableState['aggregation_function']>;
    metricField: PublishingSubject<ChangePointChartEmbeddableState['metric_field']>;
    splitField: PublishingSubject<ChangePointChartEmbeddableState['split_field']>;
    partitions: PublishingSubject<ChangePointChartEmbeddableState['partitions']>;
    maxSeriesToPlot: PublishingSubject<ChangePointChartEmbeddableState['max_series_to_plot']>;
    updateUserInput: (update: ChangePointEmbeddableCustomState) => void;
}
export type ChangePointEmbeddableApi = DefaultEmbeddableApi<ChangePointChartEmbeddableState> & HasEditCapabilities & PublishesDataViews & PublishesTimeRange & ChangePointComponentApi;
