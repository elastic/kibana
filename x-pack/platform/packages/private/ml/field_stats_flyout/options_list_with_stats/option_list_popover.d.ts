import React from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxSingleSelectionShape } from '@elastic/eui';
import { type DropDownLabel } from './types';
interface OptionsListPopoverProps {
    options: DropDownLabel[];
    renderOption: (option: DropDownLabel) => React.ReactNode;
    singleSelection?: boolean | EuiComboBoxSingleSelectionShape;
    onChange?: ((newSuggestions: DropDownLabel[]) => void) | ((newSuggestions: Array<EuiComboBoxOptionOption<string | number | string[] | undefined>>) => void);
    setPopoverOpen: (open: boolean) => void;
    isLoading?: boolean;
}
export declare const OptionsListPopover: ({ options, renderOption, singleSelection, onChange, setPopoverOpen, isLoading, }: OptionsListPopoverProps) => React.JSX.Element;
export {};
