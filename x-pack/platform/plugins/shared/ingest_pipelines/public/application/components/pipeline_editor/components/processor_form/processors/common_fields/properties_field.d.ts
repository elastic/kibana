import type { FunctionComponent } from 'react';
import React from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
interface Props {
    helpText?: React.ReactNode;
    euiFieldProps?: EuiComboBoxProps<string>;
}
export declare const PropertiesField: FunctionComponent<Props>;
export {};
