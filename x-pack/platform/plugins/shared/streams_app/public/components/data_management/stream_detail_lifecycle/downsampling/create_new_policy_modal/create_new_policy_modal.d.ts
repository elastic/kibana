import React from 'react';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
interface FormData {
    policyName: string;
}
export declare const createPolicyNameValidations: ({ policies, }: {
    policies: string[];
}) => Array<{
    validator: ValidationFunc<FormData, string, string>;
}>;
export interface CreatePolicyModalProps {
    policyNames: string[];
    onBack: () => void;
    onSave: (policyName: string) => void;
    isLoading?: boolean;
    originalPolicyName: string;
}
export declare function CreatePolicyModal({ policyNames, onBack, onSave, isLoading, originalPolicyName, }: CreatePolicyModalProps): React.JSX.Element;
export {};
