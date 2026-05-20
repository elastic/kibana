import React from 'react';
import type { LogCategory } from '../../types';
import type { LogCategoriesGridCellDependencies } from './log_categories_grid_cell';
export interface LogCategoriesGridProps {
    dependencies: LogCategoriesGridDependencies;
    logCategories: LogCategory[];
    expandedRowIndex: number | null;
    onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
    onCloseFlyout: () => void;
}
export type LogCategoriesGridDependencies = LogCategoriesGridCellDependencies;
export declare const LogCategoriesGrid: React.FC<LogCategoriesGridProps>;
