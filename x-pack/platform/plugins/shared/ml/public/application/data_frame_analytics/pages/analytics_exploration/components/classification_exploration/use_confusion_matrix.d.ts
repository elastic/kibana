import { type ConfusionMatrix, type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { ResultsSearchQuery, ClassificationMetricItem } from '../../../../common/analytics';
export declare const useConfusionMatrix: (jobConfig: DataFrameAnalyticsConfig, searchQuery: ResultsSearchQuery) => {
    avgRecall: number | null;
    confusionMatrixData: ConfusionMatrix[];
    docsCount: number | null;
    error: string | null;
    isLoading: boolean;
    overallAccuracy: number | null;
    evaluationMetricsItems: ClassificationMetricItem[];
};
