import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export type StartAction = ReturnType<typeof useStartAction>;
export declare const useStartAction: (canStartStopDataFrameAnalytics: boolean) => {
    action: import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/basic_table/action_types").DefaultItemEmptyButtonAction<DataFrameAnalyticsListRow>, import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>> & import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>;
    closeModal: () => void;
    isModalVisible: boolean;
    item: DataFrameAnalyticsListRow | undefined;
    openModal: (newItem: DataFrameAnalyticsListRow) => void;
    startAndCloseModal: () => void;
};
