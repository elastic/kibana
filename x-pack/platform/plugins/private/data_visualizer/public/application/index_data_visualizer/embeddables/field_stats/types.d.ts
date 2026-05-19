import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { HasEditCapabilities, PublishesBlockingError, PublishesDataLoading, PublishesDataViews, PublishesTimeRange } from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import type { FieldStatisticsTableEmbeddableState, FieldStatsInitializerViewType, FieldStatsInitialState } from '../grid_embeddable/types';
export interface FieldStatsControlsApi {
    viewType$: BehaviorSubject<FieldStatsInitializerViewType>;
    dataViewId$: BehaviorSubject<string>;
    query$: BehaviorSubject<AggregateQuery>;
    showDistributions$: BehaviorSubject<boolean>;
    updateUserInput: (update: Partial<FieldStatsInitialState>) => void;
}
export type FieldStatisticsTableEmbeddableApi = DefaultEmbeddableApi<FieldStatisticsTableEmbeddableState> & HasEditCapabilities & PublishesDataViews & PublishesTimeRange & PublishesDataLoading & PublishesBlockingError & FieldStatsControlsApi;
