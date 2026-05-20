import { type EuiFormRowProps } from '@elastic/eui';
import React from 'react';
export type SecretType = 'output' | 'ssl' | 'download_source_auth';
export declare const SecretFormRow: React.FC<{
    fullWidth?: boolean;
    children: EuiFormRowProps['children'];
    useSecretsStorage: boolean;
    isConvertedToSecret?: boolean;
    onToggleSecretStorage?: (secretEnabled: boolean) => void;
    error?: string[];
    isInvalid?: boolean;
    title?: string;
    clear?: () => void;
    initialValue?: any;
    cancelEdit?: () => void;
    label?: JSX.Element;
    disabled?: boolean;
    secretType?: SecretType;
}>;
