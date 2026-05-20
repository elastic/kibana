import React from 'react';
import type { OutputFormInputsType } from './use_output_form';
interface Props {
    inputs: OutputFormInputsType;
    useSecretsStorage: boolean;
    onToggleSecretStorage: (secretEnabled: boolean) => void;
}
export interface IsConvertedToSecret {
    sslKey: boolean;
    serviceToken: boolean;
    kibanaAPIKey: boolean;
}
export declare const OutputFormRemoteEsSection: React.FunctionComponent<Props>;
export {};
