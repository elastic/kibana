import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export type StopAction = ReturnType<typeof useStopAction>;
export declare const useStopAction: (canStartStopDataFrameAnalytics: boolean) => {
    action: import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/basic_table/action_types").DefaultItemEmptyButtonAction<DataFrameAnalyticsListRow>, import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>> & import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>;
    closeModal: () => void;
    isModalVisible: boolean;
    item: DataFrameAnalyticsListRow | undefined;
    openModal: (newItem: DataFrameAnalyticsListRow) => void;
    forceStopAndCloseModal: () => void;
};
