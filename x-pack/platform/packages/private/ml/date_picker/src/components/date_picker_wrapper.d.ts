import type { FC } from 'react';
import { type EuiSuperDatePickerProps } from '@elastic/eui';
/**
 * DatePickerWrapper React Component props interface
 */
interface DatePickerWrapperProps {
    /**
     * Boolean flag to be passed on to `EuiSuperDatePicker`.
     */
    isAutoRefreshOnly?: boolean;
    /**
     * Boolean flag to indicate loading state.
     */
    isLoading?: boolean;
    /**
     * Boolean flag to enforce showing/hiding the refresh button.
     */
    showRefresh?: boolean;
    /**
     * Width setting to be passed on to `EuiSuperDatePicker`
     */
    width?: EuiSuperDatePickerProps['width'];
    /**
     * Boolean flag to disable the date picker
     */
    isDisabled?: boolean;
    /**
     * Boolean flag to force change from 'Refresh' to 'Update' state
     */
    needsUpdate?: boolean;
    /**
     * Callback function that gets called
     * when EuiSuperDatePicker's 'Refresh'|'Update' button is clicked
     */
    onRefresh?: () => void;
    /**
     * Tooltip message for the update button
     */
    tooltipMessage?: string;
    /**
     * Data test subject for the refresh button
     */
    dataTestSubj?: string;
}
/**
 * DatePickerWrapper React Component
 *
 * @type {FC<DatePickerWrapperProps>}
 * @param props - `DatePickerWrapper` component props
 * @returns {React.ReactElement} The DatePickerWrapper component.
 */
export declare const DatePickerWrapper: FC<DatePickerWrapperProps>;
export {};
