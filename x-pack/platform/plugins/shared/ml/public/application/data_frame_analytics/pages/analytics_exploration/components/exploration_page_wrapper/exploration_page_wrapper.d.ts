import type { FC } from 'react';
import { type DataFrameAnalyticsConfig, type DataFrameTaskStateType } from '@kbn/ml-data-frame-analytics-utils';
import type { ResultsSearchQuery } from '../../../../common/analytics';
import type { FeatureImportanceSummaryPanelProps } from '../total_feature_importance_summary/feature_importance_summary';
export interface EvaluatePanelProps {
    jobConfig: DataFrameAnalyticsConfig;
    jobStatus?: DataFrameTaskStateType;
    searchQuery: ResultsSearchQuery;
}
interface Props {
    jobId: string;
    title: string;
    EvaluatePanel: FC<EvaluatePanelProps>;
    FeatureImportanceSummaryPanel: FC<FeatureImportanceSummaryPanelProps>;
}
export declare const ExplorationPageWrapper: FC<Props>;
export {};
