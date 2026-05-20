import type { DataView } from '@kbn/data-views-plugin/public';
import { type DataFrameAnalyticsConfig, type DataFrameTaskStateType, type TotalFeatureImportance } from '@kbn/ml-data-frame-analytics-utils';
export declare const useResultsViewConfig: (jobId: string) => {
    dataView: DataView | undefined;
    dataViewErrorMessage: string | undefined;
    isInitialized: boolean;
    isLoadingJobConfig: boolean;
    jobCapsServiceErrorMessage: string | undefined;
    jobConfig: DataFrameAnalyticsConfig | undefined;
    jobConfigErrorMessage: string | undefined;
    jobStatus: DataFrameTaskStateType | undefined;
    needsDestDataView: boolean;
    totalFeatureImportance: TotalFeatureImportance[] | undefined;
};
