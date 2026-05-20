import React from 'react';
import type { OutputFormInputsType } from './use_output_form';
interface Props {
    inputs: OutputFormInputsType;
    useSecretsStorage: boolean;
    onToggleSecretStorage: (secretEnabled: boolean) => void;
}
export declare const OutputFormElasticsearchSection: React.FunctionComponent<Props>;
export {};
