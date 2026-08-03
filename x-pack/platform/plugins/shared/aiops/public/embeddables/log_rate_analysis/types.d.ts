import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasEditCapabilities, PublishesDataViews, PublishesTimeRange, PublishingSubject } from '@kbn/presentation-publishing';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
export interface LogRateAnalysisComponentApi {
    dataViewId: PublishingSubject<LogRateAnalysisEmbeddableState['data_view_id']>;
    updateUserInput: (update: Pick<LogRateAnalysisEmbeddableState, 'data_view_id'>) => void;
}
export type LogRateAnalysisEmbeddableApi = DefaultEmbeddableApi<LogRateAnalysisEmbeddableState> & HasEditCapabilities & PublishesDataViews & PublishesTimeRange & LogRateAnalysisComponentApi;
