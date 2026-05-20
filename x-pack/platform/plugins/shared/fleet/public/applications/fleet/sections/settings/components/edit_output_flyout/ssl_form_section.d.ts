import React from 'react';
import type { DownloadSourceFormInputsType } from '../download_source_flyout/use_download_source_flyout_form';
import type { OutputFormInputsType } from './use_output_form';
export type FormType = 'elasticsearch' | 'remote_elasticsearch' | 'logstash' | 'download_source';
interface Props {
    inputs: OutputFormInputsType | DownloadSourceFormInputsType;
    useSecretsStorage: boolean;
    isConvertedToSecret: boolean;
    onToggleSecretAndClearValue: (secretEnabled: boolean) => void;
    type: FormType;
}
export declare const SSLFormSection: React.FunctionComponent<Props>;
export {};
