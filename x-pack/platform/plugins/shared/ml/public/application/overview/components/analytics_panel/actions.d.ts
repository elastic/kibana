import type { FC } from 'react';
import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import type { DataFrameAnalyticsListRow } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
interface Props {
    item: DataFrameAnalyticsListRow;
}
export declare const ViewLink: FC<Props>;
export declare function useTableActions(): Array<Action<DataFrameAnalyticsListRow>>;
export {};
