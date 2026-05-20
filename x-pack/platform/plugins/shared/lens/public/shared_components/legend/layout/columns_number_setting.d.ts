import React from 'react';
export declare const DEFAULT_FLOATING_COLUMNS = 1;
interface ColumnsNumberSettingProps {
    /**
     * Sets the number of columns for legend inside chart
     */
    floatingColumns?: number;
    /**
     * Callback on horizontal alignment option change
     */
    onFloatingColumnsChange?: (value: number) => void;
    /**
     * Indicates if the component should be hidden
     */
    isHidden: boolean;
}
export declare const ColumnsNumberSetting: ({ floatingColumns, onFloatingColumnsChange, isHidden, }: ColumnsNumberSettingProps) => React.JSX.Element | null;
export {};
