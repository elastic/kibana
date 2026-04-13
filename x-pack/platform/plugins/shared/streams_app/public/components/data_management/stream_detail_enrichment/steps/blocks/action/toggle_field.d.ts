import React from 'react';
import type { EuiFormRowProps } from '@elastic/eui';
import type { ExtractBooleanFields, ProcessorFormState } from '../../../types';
interface ToggleFieldProps {
    helpText?: EuiFormRowProps['helpText'];
    id?: string;
    label: string;
    name: ExtractBooleanFields<ProcessorFormState>;
}
export declare const ToggleField: ({ helpText, id, label, name, ...rest }: ToggleFieldProps) => React.JSX.Element;
export {};
