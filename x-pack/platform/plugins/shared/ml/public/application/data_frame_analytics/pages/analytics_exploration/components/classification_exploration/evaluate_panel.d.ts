import type { FC } from 'react';
import { type DataFrameAnalyticsConfig, type DataFrameTaskStateType } from '@kbn/ml-data-frame-analytics-utils';
import type { ResultsSearchQuery } from '../../../../common/analytics';
export interface EvaluatePanelProps {
    jobConfig: DataFrameAnalyticsConfig;
    jobStatus?: DataFrameTaskStateType;
    searchQuery: ResultsSearchQuery;
}
export declare const EvaluatePanel: FC<EvaluatePanelProps>;
