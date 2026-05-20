import { type EuiFormRowProps } from '@elastic/eui';
import React from 'react';
export declare const SecretFormRow: React.FC<{
    children: EuiFormRowProps['children'];
    fullWidth: boolean;
    useSecretsStorage: boolean;
    secretLabelTitle: string;
    plainTextLabel: JSX.Element;
    additionalHelpText: string;
}>;
