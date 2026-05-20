import type { CreateActionPolicyData, ActionPolicyResponse, UpdateActionPolicyBody } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyFormState } from './types';
interface UseActionPolicyFormParams {
    initialValues?: ActionPolicyResponse;
    onSubmitCreate: (data: CreateActionPolicyData) => void;
    onSubmitUpdate: (id: string, data: UpdateActionPolicyBody) => void;
}
export declare const useActionPolicyForm: ({ initialValues, onSubmitCreate, onSubmitUpdate, }: UseActionPolicyFormParams) => {
    methods: import("react-hook-form").UseFormReturn<ActionPolicyFormState, any, undefined>;
    isEditMode: boolean;
    isSubmitEnabled: boolean;
    handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
};
export {};
