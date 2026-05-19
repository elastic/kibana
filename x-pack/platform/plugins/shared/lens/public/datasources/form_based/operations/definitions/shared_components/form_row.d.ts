import React from 'react';
import type { EuiFormRowProps } from '@elastic/eui';
type FormRowProps = EuiFormRowProps & {
    isInline?: boolean;
};
export declare const FormRow: ({ children, label, isInline, ...props }: FormRowProps) => React.JSX.Element;
export {};
