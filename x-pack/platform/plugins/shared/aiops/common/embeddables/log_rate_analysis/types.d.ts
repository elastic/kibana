import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
export interface LogRateAnalysisEmbeddableState extends SerializedTitles, SerializedTimeRange {
    dataViewId?: string;
}
export type StoredLogRateAnalysisEmbeddableState = Omit<LogRateAnalysisEmbeddableState, 'dataViewId'>;
