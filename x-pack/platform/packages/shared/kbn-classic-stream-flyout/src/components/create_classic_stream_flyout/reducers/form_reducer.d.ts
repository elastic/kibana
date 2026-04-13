import type { ValidationErrorType } from '../../../utils';
/**
 * Validation state discriminated union - makes illegal states unrepresentable.
 *
 * State transitions:
 *
 * IDLE (initial state - no validation on typing)
 *   → User types → IDLE (no validation)
 *   → User clicks Create → CREATE
 *
 * CREATE (Create button validation in progress - abort on typing)
 *   → User types → IDLE (abort Create validation, don't start new validation)
 *   → Validation completes with error → LIVE
 *   → Validation completes without error → IDLE
 *
 * LIVE (validate on every keystroke - has validation errors)
 *   → User types → LIVE (debounced validation)
 *   → Validation completes without error → IDLE
 *   → User changes pattern/template → IDLE (reset)
 */
export type ValidationState = {
    mode: 'idle';
    isValidating: false;
    validationError: null;
    conflictingIndexPattern: undefined;
} | {
    mode: 'create';
    isValidating: true;
    validationError: null;
    conflictingIndexPattern: undefined;
} | {
    mode: 'live';
    isValidating: boolean;
    validationError: ValidationErrorType;
    conflictingIndexPattern: string | undefined;
};
export interface FormState {
    selectedTemplate: string | null;
    streamName: string;
    selectedIndexPattern: string;
    streamNameParts: string[];
    validation: ValidationState;
    isSubmitting: boolean;
}
export type FormAction = {
    type: 'SET_SELECTED_TEMPLATE';
    payload: string | null;
} | {
    type: 'SET_STREAM_NAME';
    payload: string;
} | {
    type: 'SET_STREAM_NAME_PARTS';
    payload: string[];
} | {
    type: 'SET_SELECTED_INDEX_PATTERN';
    payload: string;
} | {
    type: 'START_CREATE_VALIDATION';
} | {
    type: 'START_DEBOUNCED_VALIDATION';
} | {
    type: 'COMPLETE_VALIDATION';
    payload: {
        errorType: ValidationErrorType;
        conflictingIndexPattern: string | undefined;
    };
} | {
    type: 'ABORT_VALIDATION';
} | {
    type: 'CLEAR_VALIDATION_ERROR';
} | {
    type: 'RESET_VALIDATION';
} | {
    type: 'START_SUBMITTING';
} | {
    type: 'STOP_SUBMITTING';
} | {
    type: 'RESET_FORM';
};
export declare const formReducer: (state: FormState, action: FormAction) => FormState;
export declare const initialFormState: FormState;
