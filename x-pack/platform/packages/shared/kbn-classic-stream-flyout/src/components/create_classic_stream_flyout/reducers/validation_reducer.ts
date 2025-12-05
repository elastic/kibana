/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationErrorType } from '../../../utils';

// Validation state - validation results and status (separate concern from form)
export interface ValidationState {
  validationError: ValidationErrorType;
  conflictingIndexPattern: string | undefined;
  hasAttemptedSubmit: boolean;
  isValidating: boolean;
}

export type ValidationAction =
  | { type: 'SET_VALIDATION_ERROR'; payload: ValidationErrorType }
  | { type: 'SET_CONFLICTING_INDEX_PATTERN'; payload: string | undefined }
  | { type: 'SET_HAS_ATTEMPTED_SUBMIT'; payload: boolean }
  | { type: 'SET_IS_VALIDATING'; payload: boolean }
  | { type: 'RESET_VALIDATION' };

export const validationReducer = (
  state: ValidationState,
  action: ValidationAction
): ValidationState => {
  switch (action.type) {
    case 'SET_VALIDATION_ERROR':
      return { ...state, validationError: action.payload };
    case 'SET_CONFLICTING_INDEX_PATTERN':
      return { ...state, conflictingIndexPattern: action.payload };
    case 'SET_HAS_ATTEMPTED_SUBMIT':
      return { ...state, hasAttemptedSubmit: action.payload };
    case 'SET_IS_VALIDATING':
      return { ...state, isValidating: action.payload };
    case 'RESET_VALIDATION':
      return {
        ...state,
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
      };
    default:
      return state;
  }
};

export const initialValidationState: ValidationState = {
  validationError: null,
  conflictingIndexPattern: undefined,
  hasAttemptedSubmit: false,
  isValidating: false,
};
