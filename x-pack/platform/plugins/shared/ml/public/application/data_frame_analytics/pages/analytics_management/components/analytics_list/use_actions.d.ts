import type { EuiTableActionsColumnType } from '@elastic/eui';
import type { DataFrameAnalyticsListRow } from './common';
export declare const useActions: () => {
    actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>["actions"];
    modals: JSX.Element | null;
};
