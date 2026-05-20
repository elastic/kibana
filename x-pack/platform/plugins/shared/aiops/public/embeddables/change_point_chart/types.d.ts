import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasEditCapabilities, PublishesDataViews, PublishesTimeRange, PublishingSubject } from '@kbn/presentation-publishing';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';
export interface ChangePointComponentApi {
    viewType: PublishingSubject<ChangePointEmbeddableState['viewType']>;
    dataViewId: PublishingSubject<ChangePointEmbeddableState['dataViewId']>;
    fn: PublishingSubject<ChangePointEmbeddableState['fn']>;
    metricField: PublishingSubject<ChangePointEmbeddableState['metricField']>;
    splitField: PublishingSubject<ChangePointEmbeddableState['splitField']>;
    partitions: PublishingSubject<ChangePointEmbeddableState['partitions']>;
    maxSeriesToPlot: PublishingSubject<ChangePointEmbeddableState['maxSeriesToPlot']>;
    updateUserInput: (update: ChangePointEmbeddableState) => void;
}
export type ChangePointEmbeddableApi = DefaultEmbeddableApi<ChangePointEmbeddableState> & HasEditCapabilities & PublishesDataViews & PublishesTimeRange & ChangePointComponentApi;
