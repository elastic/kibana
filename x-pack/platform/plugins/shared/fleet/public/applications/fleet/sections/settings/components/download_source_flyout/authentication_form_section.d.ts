import React from 'react';
import type { DownloadSourceFormInputsType } from './use_download_source_flyout_form';
interface AuthenticationFormSectionProps {
    inputs: DownloadSourceFormInputsType;
    useSecretsStorage: boolean;
    isConvertedToSecretPassword: boolean;
    isConvertedToSecretApiKey: boolean;
    onToggleSecretAndClearValuePassword: (secretEnabled: boolean) => void;
    onToggleSecretAndClearValueApiKey: (secretEnabled: boolean) => void;
}
export declare const AuthenticationFormSection: React.FunctionComponent<AuthenticationFormSectionProps>;
export {};
