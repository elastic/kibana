import type { GetDataFrameAnalyticsStatsResponseError, GetDataFrameAnalyticsStatsResponseOk } from '../../../../../services/ml_api_service/data_frame_analytics';
import type { DataFrameAnalyticsListRow } from '../../components/analytics_list/common';
import type { AnalyticStatsBarStats } from '../../../../../components/stats_bar';
export declare const isGetDataFrameAnalyticsStatsResponseOk: (arg: any) => arg is GetDataFrameAnalyticsStatsResponseOk;
export type GetAnalytics = (forceRefresh?: boolean, nullableAnalyticsId?: string | null) => void;
/**
 * Gets initial object for analytics stats.
 */
export declare function getInitialAnalyticsStats(): AnalyticStatsBarStats;
/**
 * Gets analytics jobs stats formatted for the stats bar.
 */
export declare function getAnalyticsJobsStats(analyticsStats: GetDataFrameAnalyticsStatsResponseOk): AnalyticStatsBarStats;
export declare const useGetAnalytics: (setAnalytics: React.Dispatch<React.SetStateAction<DataFrameAnalyticsListRow[]>>, setAnalyticsStats: (update: AnalyticStatsBarStats | undefined) => void, setErrorMessage: React.Dispatch<React.SetStateAction<GetDataFrameAnalyticsStatsResponseError | undefined>>, setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>, setJobsAwaitingNodeCount: React.Dispatch<React.SetStateAction<number>>, blockRefresh: boolean) => GetAnalytics;
