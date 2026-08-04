import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyFormState } from './types';
interface UseActionPolicyFormParams {
    initialValues?: ActionPolicyResponse;
    onSubmitCreate: (values: ActionPolicyFormState) => void;
    onSubmitUpdate: (id: string, values: ActionPolicyFormState, version: string) => void;
}
export declare const useActionPolicyForm: ({ initialValues, onSubmitCreate, onSubmitUpdate, }: UseActionPolicyFormParams) => {
    methods: import("react-hook-form").UseFormReturn<ActionPolicyFormState, any, undefined>;
    isEditMode: boolean;
    isSubmitEnabled: boolean;
    handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
};
export {};
