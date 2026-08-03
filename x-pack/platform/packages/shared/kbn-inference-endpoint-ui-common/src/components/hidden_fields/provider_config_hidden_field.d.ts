import React from 'react';
import type { ConfigEntryView } from '../../types/types';
interface ProviderConfigHiddenFieldProps {
    requiredProviderFormFields: ConfigEntryView[];
    setRequiredProviderFormFields: React.Dispatch<React.SetStateAction<ConfigEntryView[]>>;
    isSubmitting: boolean;
}
export declare const ProviderConfigHiddenField: React.FC<ProviderConfigHiddenFieldProps>;
export declare const TaskTypeConfigHiddenField: React.FC<ProviderConfigHiddenFieldProps>;
export {};
