import type { FC } from 'react';
import { type DataFrameAnalyticsConfig, type TotalFeatureImportance } from '@kbn/ml-data-frame-analytics-utils';
export interface FeatureImportanceSummaryPanelProps {
    totalFeatureImportance: TotalFeatureImportance[];
    jobConfig: DataFrameAnalyticsConfig;
}
export declare const FeatureImportanceSummaryPanel: FC<FeatureImportanceSummaryPanelProps>;
