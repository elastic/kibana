import React from 'react';
import type { LogCategory } from '../../types';
export declare const logCategoriesGridCountColumn: {
    id: "count";
    display: string;
    isSortable: true;
    schema: string;
    initialWidth: number;
};
export interface LogCategoriesGridCountCellProps {
    logCategory: LogCategory;
}
export declare const LogCategoriesGridCountCell: React.FC<LogCategoriesGridCountCellProps>;
