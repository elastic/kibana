import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export type ViewAction = ReturnType<typeof useViewAction>;
export declare const useViewAction: () => {
    action: import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/basic_table/action_types").DefaultItemEmptyButtonAction<DataFrameAnalyticsListRow>, import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>> & import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>;
};
