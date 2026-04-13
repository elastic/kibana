import { type Dispatch } from 'react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import { type StreamNameValidator } from '../../../utils';
import type { FormAction, FormState } from '../reducers/form_reducer';
interface UseStreamValidationParams {
    formState: FormState;
    dispatch: Dispatch<FormAction>;
    onCreate: (streamName: string) => Promise<void>;
    selectedTemplate: IndexTemplate | undefined;
    onValidate?: StreamNameValidator;
    debounceMs?: number;
}
interface UseStreamValidationReturn {
    handleStreamNameChange: (streamName: string) => void;
    handleCreate: () => Promise<void>;
    resetValidation: () => void;
    setStreamName: (streamName: string) => void;
}
export declare const useStreamValidation: ({ formState, dispatch, onCreate, selectedTemplate, onValidate, debounceMs, }: UseStreamValidationParams) => UseStreamValidationReturn;
export {};
