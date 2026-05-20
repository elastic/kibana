import React from 'react';
import type { OutputFormInputsType } from './use_output_form';
interface Props {
    inputs: OutputFormInputsType;
    useSecretsStorage: boolean;
    onToggleSecretStorage: (secretEnabled: boolean) => void;
    hasEncryptedSavedObjectConfigured: boolean;
}
export declare const OutputFormLogstashSection: React.FunctionComponent<Props>;
export {};
