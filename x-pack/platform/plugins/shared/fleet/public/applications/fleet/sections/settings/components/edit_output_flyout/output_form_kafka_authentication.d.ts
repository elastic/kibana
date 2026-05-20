import React from 'react';
import type { OutputFormInputsType } from './use_output_form';
export declare const OutputFormKafkaAuthentication: React.FunctionComponent<{
    inputs: OutputFormInputsType;
    useSecretsStorage: boolean;
    onToggleSecretStorage: (secretEnabled: boolean) => void;
}>;
