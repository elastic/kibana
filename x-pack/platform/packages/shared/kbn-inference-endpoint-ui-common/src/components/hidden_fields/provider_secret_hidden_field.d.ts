import React from 'react';
import type { ConfigEntryView } from '../../types/types';
interface ProviderSecretHiddenFieldProps {
    requiredProviderFormFields: ConfigEntryView[];
    setRequiredProviderFormFields: React.Dispatch<React.SetStateAction<ConfigEntryView[]>>;
    isSubmitting: boolean;
}
export declare const ProviderSecretHiddenField: React.FC<ProviderSecretHiddenFieldProps>;
export {};
