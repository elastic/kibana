import type { FC } from 'react';
import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export declare const startActionNameText: string;
interface StartActionNameProps {
    canStartStopDataFrameAnalytics: boolean;
    isDisabled: boolean;
    item: DataFrameAnalyticsListRow;
}
export declare const StartActionName: FC<StartActionNameProps>;
export {};
