import React from 'react';
import type { EuiFormControlLayoutProps, EuiSelectableOption } from '@elastic/eui';
interface MultiSuperSelect<T> {
    prepend: EuiFormControlLayoutProps['prepend'];
    inputDisplay: React.JSX.Element | string;
    options: Array<EuiSelectableOption<T>>;
    onOptionsChange?: (options: Array<EuiSelectableOption<T>>) => void;
    'aria-label'?: string;
}
export declare const MultiSuperSelect: <T = string>({ prepend, inputDisplay, options, onOptionsChange, "aria-label": ariaLabel, }: MultiSuperSelect<T>) => React.JSX.Element;
export {};
