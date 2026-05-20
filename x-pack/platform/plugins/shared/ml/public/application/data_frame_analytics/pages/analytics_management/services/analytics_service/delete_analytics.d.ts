import type { DataFrameAnalyticsListRow } from '../../components/analytics_list/common';
export declare const useDeleteAnalytics: () => (analyticsConfig: DataFrameAnalyticsListRow["config"]) => Promise<void>;
export declare const useDeleteAnalyticsAndDestIndex: () => (analyticsConfig: DataFrameAnalyticsListRow["config"], deleteDestIndex: boolean, deleteDestDataView: boolean) => Promise<void>;
export declare const useCanDeleteIndex: () => (indexName: string) => Promise<boolean | undefined>;
