import type { RenderCellValue } from '@elastic/eui';
import type { LogCategory } from '../../types';
import type { LogCategoriesGridChangeTimeCellDependencies } from './log_categories_grid_change_time_cell';
import type { LogCategoriesGridHistogramCellDependencies } from './log_categories_grid_histogram_cell';
export interface LogCategoriesGridCellContext {
    dependencies: LogCategoriesGridCellDependencies;
    logCategories: LogCategory[];
}
export type LogCategoriesGridCellDependencies = LogCategoriesGridHistogramCellDependencies & LogCategoriesGridChangeTimeCellDependencies;
export declare const renderLogCategoriesGridCell: RenderCellValue;
export declare const logCategoriesGridColumns: ({
    id: "change_time";
    display: string;
    isSortable: true;
    initialWidth: number;
    schema: string;
} | {
    id: "change_type";
    display: string;
    isSortable: true;
    initialWidth: number;
} | {
    id: "count";
    display: string;
    isSortable: true;
    schema: string;
    initialWidth: number;
} | {
    id: "history";
    display: string;
    isSortable: false;
    initialWidth: number;
    isExpandable: false;
} | {
    id: "pattern";
    display: string;
    isSortable: false;
    schema: string;
})[];
export declare const logCategoriesGridColumnIds: ("pattern" | "count" | "history" | "change_type" | "change_time")[];
export type LogCategoriesGridColumnId = (typeof logCategoriesGridColumns)[number]['id'];
declare const cellContextKey = "cellContext";
export declare const getCellContext: (cellContext: object) => LogCategoriesGridCellContext;
export declare const createCellContext: (logCategories: LogCategory[], dependencies: LogCategoriesGridCellDependencies) => {
    [cellContextKey]: LogCategoriesGridCellContext;
};
export {};
