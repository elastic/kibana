import type { EuiFieldTextProps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
export interface TokenFieldProps extends Omit<EuiFieldTextProps, 'append'> {
    value: string;
}
export declare const TokenField: FunctionComponent<TokenFieldProps>;
export interface SelectableTokenFieldOption {
    key: string;
    value: string;
    icon?: string;
    label: string;
    description?: string;
}
export interface SelectableTokenFieldProps extends Omit<EuiFieldTextProps, 'value' | 'prepend'> {
    options: SelectableTokenFieldOption[];
}
export declare const SelectableTokenField: FunctionComponent<SelectableTokenFieldProps>;
