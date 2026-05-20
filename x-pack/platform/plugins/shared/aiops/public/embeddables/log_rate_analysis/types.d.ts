import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasEditCapabilities, PublishesDataViews, PublishesTimeRange, PublishingSubject } from '@kbn/presentation-publishing';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';
export interface LogRateAnalysisComponentApi {
    dataViewId: PublishingSubject<LogRateAnalysisEmbeddableState['dataViewId']>;
    updateUserInput: (update: LogRateAnalysisEmbeddableState) => void;
}
export type LogRateAnalysisEmbeddableApi = DefaultEmbeddableApi<LogRateAnalysisEmbeddableState> & HasEditCapabilities & PublishesDataViews & PublishesTimeRange & LogRateAnalysisComponentApi;
