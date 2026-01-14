/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
export type ValidationState =
  | {
      mode: 'idle';
      isValidating: false;
      validationError: null;
      conflictingIndexPattern: undefined;
    }
  | {
      mode: 'create';
      isValidating: true;
      validationError: null;
      conflictingIndexPattern: undefined;
    }
  | {
      mode: 'live';
      isValidating: boolean; // Can be true (validating) or false (error visible, not currently validating)
      validationError: ValidationErrorType; // Must have an error in live mode
      conflictingIndexPattern: string | undefined;
    };

export interface FormState {
  // User inputs
  selectedTemplate: string | null;
  streamName: string;
  selectedIndexPattern: string;
  streamNameParts: string[]; // Wildcard replacement values

  // Validation state
  validation: ValidationState;

  // Submission state - tracks when onCreate is running
  isSubmitting: boolean;
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
  // Submission flow actions
  | { type: 'START_SUBMITTING' }
  | { type: 'STOP_SUBMITTING' }
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
        validation: {
          mode: 'idle',
          isValidating: false,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

    case 'START_CREATE_VALIDATION':
      // User clicked Create button
      return {
        ...state,
        validation: {
          mode: 'create',
          isValidating: true,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

    case 'START_DEBOUNCED_VALIDATION':
      // User typed in LIVE mode - keep validating with debounce
      // Type system ensures we're already in live mode
      if (state.validation.mode !== 'live') {
        return state;
      }
      return {
        ...state,
        validation: {
          ...state.validation,
          isValidating: true,
        },
      };

    case 'COMPLETE_VALIDATION': {
      const { errorType, conflictingIndexPattern } = action.payload;

      if (errorType !== null) {
        // Has error - enter LIVE mode
        return {
          ...state,
          validation: {
            mode: 'live',
            isValidating: false,
            validationError: errorType,
            conflictingIndexPattern,
          },
        };
      } else {
        // No error - return to IDLE
        return {
          ...state,
          validation: {
            mode: 'idle',
            isValidating: false,
            validationError: null,
            conflictingIndexPattern: undefined,
          },
        };
      }
    }

    case 'ABORT_VALIDATION':
      // Aborted (e.g., user typed during Create) - return to IDLE
      return {
        ...state,
        validation: {
          mode: 'idle',
          isValidating: false,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

    case 'CLEAR_VALIDATION_ERROR':
      return {
        ...state,
        validation: {
          mode: 'idle',
          isValidating: false,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

    case 'RESET_VALIDATION':
      return {
        ...state,
        validation: {
          mode: 'idle',
          isValidating: false,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

    case 'RESET_FORM':
      return initialFormState;

    case 'START_SUBMITTING':
      return { ...state, isSubmitting: true };

    case 'STOP_SUBMITTING':
      return { ...state, isSubmitting: false };

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

  // Validation state
  validation: {
    mode: 'idle',
    isValidating: false,
    validationError: null,
    conflictingIndexPattern: undefined,
  },

  // Submission state
  isSubmitting: false,
};
