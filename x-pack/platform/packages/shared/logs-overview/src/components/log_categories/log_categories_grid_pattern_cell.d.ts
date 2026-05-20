import React from 'react';
import type { LogCategory } from '../../types';
export declare const logCategoriesGridPatternColumn: {
    id: "pattern";
    display: string;
    isSortable: false;
    schema: string;
};
export interface LogCategoriesGridPatternCellProps {
    logCategory: LogCategory;
}
export declare const LogCategoriesGridPatternCell: React.FC<LogCategoriesGridPatternCellProps>;
