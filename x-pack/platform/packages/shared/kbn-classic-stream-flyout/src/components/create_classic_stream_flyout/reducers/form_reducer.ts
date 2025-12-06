/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationErrorType } from '../../../utils';

export interface FormState {
  // User inputs
  selectedTemplate: string | null;
  streamName: string;
  selectedIndexPattern: string;

  // Validation/submission flow
  isSubmitting: boolean;
  isValidating: boolean;
  hasAttemptedSubmit: boolean;

  // Validation results
  validationError: ValidationErrorType;
  conflictingIndexPattern: string | undefined;
}

export type FormAction =
  // Form input actions
  | { type: 'SET_SELECTED_TEMPLATE'; payload: string | null }
  | { type: 'SET_STREAM_NAME'; payload: string }
  | { type: 'SET_SELECTED_INDEX_PATTERN'; payload: string }
  // Validation flow actions
  | { type: 'START_CREATE_VALIDATION' }
  | { type: 'START_DEBOUNCED_VALIDATION' }
  | {
      type: 'COMPLETE_VALIDATION';
      payload: {
        errorType: ValidationErrorType;
        conflictingIndexPattern: string | undefined;
      };
    }
  | { type: 'ABORT_VALIDATION' }
  | { type: 'CLEAR_VALIDATION_ERROR' }
  | { type: 'RESET_VALIDATION' }
  // Combined actions
  | { type: 'RESET_FORM' };

export const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_SELECTED_TEMPLATE':
      // When template changes, reset everything
      return {
        ...initialFormState,
        selectedTemplate: action.payload,
      };

    case 'SET_STREAM_NAME':
      return { ...state, streamName: action.payload };

    case 'SET_SELECTED_INDEX_PATTERN':
      // When index pattern changes, reset validation state
      return {
        ...state,
        selectedIndexPattern: action.payload,
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
        isSubmitting: false,
      };

    case 'START_CREATE_VALIDATION':
      return {
        ...state,
        isSubmitting: true,
        isValidating: true,
        hasAttemptedSubmit: true,
      };

    case 'START_DEBOUNCED_VALIDATION':
      return {
        ...state,
        isValidating: true,
        isSubmitting: false, // User is editing, not submitting
      };

    case 'COMPLETE_VALIDATION': {
      const { errorType, conflictingIndexPattern } = action.payload;
      return {
        ...state,
        validationError: errorType,
        conflictingIndexPattern,
        isValidating: false,
        isSubmitting: false,
      };
    }

    case 'ABORT_VALIDATION':
      return {
        ...state,
        isValidating: false,
        isSubmitting: false,
      };

    case 'CLEAR_VALIDATION_ERROR':
      return {
        ...state,
        validationError: null,
        conflictingIndexPattern: undefined,
      };

    case 'RESET_VALIDATION':
      return {
        ...state,
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
        isSubmitting: false,
      };

    case 'RESET_FORM':
      return initialFormState;

    default:
      return state;
  }
};

export const initialFormState: FormState = {
  // User inputs
  selectedTemplate: null,
  streamName: '',
  selectedIndexPattern: '',

  // Validation/submission flow
  isSubmitting: false,
  isValidating: false,
  hasAttemptedSubmit: false,

  // Validation results
  validationError: null,
  conflictingIndexPattern: undefined,
};
