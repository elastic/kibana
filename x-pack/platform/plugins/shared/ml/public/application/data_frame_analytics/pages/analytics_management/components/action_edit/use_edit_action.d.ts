import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export declare const isEditActionFlyoutVisible: (editAction: any) => editAction is Required<EditAction>;
export interface EditAction {
    isFlyoutVisible: boolean;
    item?: DataFrameAnalyticsListRow;
    closeFlyout: () => void;
    openFlyout: (newItem: DataFrameAnalyticsListRow) => void;
}
export declare const useEditAction: (canStartStopDataFrameAnalytics: boolean) => {
    action: import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/basic_table/action_types").DefaultItemEmptyButtonAction<DataFrameAnalyticsListRow>, import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>> & import("@elastic/eui/src/components/basic_table/action_types").DefaultItemIconButtonAction<DataFrameAnalyticsListRow>;
    isFlyoutVisible: boolean;
    item: DataFrameAnalyticsListRow | undefined;
    closeFlyout: () => void;
    openFlyout: (newItem: DataFrameAnalyticsListRow) => void;
};
