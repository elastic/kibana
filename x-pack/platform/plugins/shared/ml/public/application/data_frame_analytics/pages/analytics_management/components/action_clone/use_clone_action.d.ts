import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export type CloneAction = ReturnType<typeof useCloneAction>;
export declare const useCloneAction: (canCreateDataFrameAnalytics: boolean) => {
    action: import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/basic_table/action_types").DefaultItemEmptyButtonAction<DataFrameAnalyticsListRow>, import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>> & import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>;
};
