import type { ReactNode } from 'react';
import type { DropDownLabel } from '.';
import type { FieldForStats } from './field_stats_info_button';
export declare const optionCss: import("@emotion/react").SerializedStyles;
/**
 * Custom hook for managing field statistics trigger functionality.
 *
 * @returns An object containing the following properties and functions:
 *   - `renderOption`: A callback function for rendering options in a combo box.
 *   - `setIsFlyoutVisible`: A function for setting the visibility of the flyout.
 *   - `setFieldName`: A function for setting the field name.
 *   - `handleFieldStatsButtonClick`: A callback function for handling field stats button click.
 *   - `closeFlyout`: A callback function for closing the flyout.
 *   - `optionCss`: CSS styles for the options in the combo box.
 *   - `populatedFields`: A set of populated fields.
 */
export declare function useFieldStatsTrigger<T = DropDownLabel>(): {
    renderOption: (option: T) => ReactNode;
    setIsFlyoutVisible: (v: boolean) => void;
    setFieldName: (v: string | undefined) => void;
    handleFieldStatsButtonClick: (field: FieldForStats) => void;
    closeFlyout: () => void;
    optionCss: import("@emotion/react").SerializedStyles;
    populatedFields: Set<string> | undefined;
};
export type UseFieldStatsTrigger = typeof useFieldStatsTrigger;
