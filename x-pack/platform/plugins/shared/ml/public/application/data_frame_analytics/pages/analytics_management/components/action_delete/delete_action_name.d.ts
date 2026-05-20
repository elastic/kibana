import type { FC } from 'react';
import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
export declare const deleteActionNameText: string;
interface DeleteActionNameProps {
    isDisabled: boolean;
    item: DataFrameAnalyticsListRow;
}
export declare const DeleteActionName: FC<DeleteActionNameProps>;
export {};
