import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { DataGridItem } from '@kbn/ml-data-grid';
export declare const getOutlierScoreFieldName: (jobConfig: DataFrameAnalyticsConfig) => string;
export declare const getFeatureCount: (resultsField: string, tableItems?: DataGridItem[]) => number;
