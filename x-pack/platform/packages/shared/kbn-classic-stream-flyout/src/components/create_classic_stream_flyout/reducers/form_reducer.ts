/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationErrorType } from '../../../utils';

/**
 * Validation mode state machine:
 *
 * IDLE (initial state)
 *   → User clicks Create → SUBMITTING
 *
 * SUBMITTING (Create button validation in progress)
 *   → User types → LIVE (abort Create, start debounced validation, stay in validating state)
 *   → Validation completes with error → LIVE
 *   → Validation completes without error → IDLE
 *
 * LIVE (validate on every keystroke - either because of error OR because user interrupted Create)
 *   → User types → LIVE (stays in LIVE, validates again with debounce)
 *   → Validation completes without error → IDLE
 *   → User changes pattern/template → IDLE (reset)
 */
export type ValidationMode = 'idle' | 'submitting' | 'live';

export interface FormState {
  // User inputs
  selectedTemplate: string | null;
  streamName: string;
  selectedIndexPattern: string;
  streamNameParts: string[]; // Wildcard replacement values

  // Validation state machine
  validationMode: ValidationMode;
  isValidating: boolean; // True when async validation is in progress

  // Validation results
  validationError: ValidationErrorType;
  conflictingIndexPattern: string | undefined;
}

export type FormAction =
  // Form input actions
  | { type: 'SET_SELECTED_TEMPLATE'; payload: string | null }
  | { type: 'SET_STREAM_NAME'; payload: string }
  | { type: 'SET_STREAM_NAME_PARTS'; payload: string[] }
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

    case 'SET_STREAM_NAME_PARTS':
      return { ...state, streamNameParts: action.payload };

    case 'SET_SELECTED_INDEX_PATTERN':
      // When index pattern changes, reset to idle
      return {
        ...state,
        selectedIndexPattern: action.payload,
        streamNameParts: [],
        validationMode: 'idle',
        isValidating: false,
        validationError: null,
        conflictingIndexPattern: undefined,
      };

    case 'START_CREATE_VALIDATION':
      // User clicked Create button
      return {
        ...state,
        validationMode: 'submitting',
        isValidating: true,
      };

    case 'START_DEBOUNCED_VALIDATION':
      // User typed during/after validation - enter LIVE mode (keeps validating on typing)
      return {
        ...state,
        validationMode: 'live',
        isValidating: true,
      };

    case 'COMPLETE_VALIDATION': {
      const { errorType, conflictingIndexPattern } = action.payload;
      return {
        ...state,
        validationError: errorType,
        conflictingIndexPattern,
        isValidating: false,
        // Stay in LIVE if error, return to IDLE if no error
        validationMode: errorType !== null ? 'live' : 'idle',
      };
    }

    case 'ABORT_VALIDATION':
      // Aborted due to template/pattern change - return to IDLE
      return {
        ...state,
        validationMode: 'idle',
        isValidating: false,
      };

    case 'CLEAR_VALIDATION_ERROR':
      return {
        ...state,
        validationError: null,
        conflictingIndexPattern: undefined,
      };

    case 'RESET_VALIDATION':
      // Manually reset to idle (e.g., when changing template/pattern)
      return {
        ...state,
        validationMode: 'idle',
        isValidating: false,
        validationError: null,
        conflictingIndexPattern: undefined,
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
  streamNameParts: [],

  // Validation state machine
  validationMode: 'idle',
  isValidating: false,

  // Validation results
  validationError: null,
  conflictingIndexPattern: undefined,
};
