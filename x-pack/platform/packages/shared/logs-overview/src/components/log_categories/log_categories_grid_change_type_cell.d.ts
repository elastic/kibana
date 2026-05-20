import React from 'react';
import type { LogCategory } from '../../types';
export declare const logCategoriesGridChangeTypeColumn: {
    id: "change_type";
    display: string;
    isSortable: true;
    initialWidth: number;
};
export interface LogCategoriesGridChangeTypeCellProps {
    logCategory: LogCategory;
}
export declare const LogCategoriesGridChangeTypeCell: React.FC<LogCategoriesGridChangeTypeCellProps>;
