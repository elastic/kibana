import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import React from 'react';
import type { LogCategory } from '../../types';
export declare const logCategoriesGridHistoryColumn: {
    id: "history";
    display: string;
    isSortable: false;
    initialWidth: number;
    isExpandable: false;
};
export interface LogCategoriesGridHistogramCellProps {
    dependencies: LogCategoriesGridHistogramCellDependencies;
    logCategory: LogCategory;
}
export interface LogCategoriesGridHistogramCellDependencies {
    charts: ChartsPluginStart;
}
export declare const LogCategoriesGridHistogramCell: React.FC<LogCategoriesGridHistogramCellProps>;
