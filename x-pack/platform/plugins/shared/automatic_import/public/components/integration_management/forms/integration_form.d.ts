import React from 'react';
import { type FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IntegrationFormData } from './types';
export declare const usePackageNames: () => Set<string> | undefined;
export interface IntegrationFormProviderProps {
    children?: React.ReactNode;
    initialValue?: Partial<IntegrationFormData>;
    existingDataStreamTitles?: Set<string>;
    onSubmit: (data: IntegrationFormData) => Promise<void>;
}
export declare const IntegrationFormProvider: React.FC<IntegrationFormProviderProps>;
export declare const useIntegrationForm: () => {
    form: FormHook<IntegrationFormData>;
    formData: IntegrationFormData;
    isValid: string | boolean;
    isFormModified: boolean;
    submit: () => Promise<{
        data: IntegrationFormData;
        isValid: boolean;
    }>;
    reset: () => void;
    validate: () => Promise<boolean>;
};
