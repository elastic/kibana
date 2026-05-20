import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import React from 'react';
import type { LogCategory } from '../../types';
export declare const logCategoriesGridChangeTimeColumn: {
    id: "change_time";
    display: string;
    isSortable: true;
    initialWidth: number;
    schema: string;
};
export interface LogCategoriesGridChangeTimeCellProps {
    dependencies: LogCategoriesGridChangeTimeCellDependencies;
    logCategory: LogCategory;
}
export interface LogCategoriesGridChangeTimeCellDependencies {
    uiSettings: SettingsStart;
}
export declare const LogCategoriesGridChangeTimeCell: React.FC<LogCategoriesGridChangeTimeCellProps>;
