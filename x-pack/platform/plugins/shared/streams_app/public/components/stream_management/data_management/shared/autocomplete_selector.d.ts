import React from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
export interface Suggestion {
    name: string;
    type?: string;
    icon?: boolean;
}
export interface AutocompleteSelectorProps {
    value?: string;
    onChange?: (value: string) => void;
    label?: string;
    helpText?: string;
    placeholder?: string;
    disabled?: boolean;
    compressed?: boolean;
    fullWidth?: boolean;
    dataTestSubj?: string;
    isInvalid?: boolean;
    error?: string;
    suggestions?: Suggestion[];
    autoFocus?: boolean;
    hideSuggestions?: boolean;
    labelAppend?: React.ReactNode;
    showIcon?: boolean;
    prepend?: EuiComboBoxProps<string>['prepend'];
}
/**
 * Generalized field selector component with autocomplete suggestions
 */
export declare const AutocompleteSelector: ({ value, onChange, label, helpText, placeholder, disabled, compressed, fullWidth, dataTestSubj, isInvalid, error, suggestions, autoFocus, hideSuggestions, labelAppend, showIcon, prepend, }: AutocompleteSelectorProps) => React.JSX.Element;
