/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formReducer, initialFormState } from './form_reducer';
import type { FormState } from './form_reducer';

describe('formReducer', () => {
  it('should return initial state', () => {
    const state = formReducer(initialFormState, { type: 'RESET_FORM' });
    expect(state).toEqual(initialFormState);
  });

  describe('SET_SELECTED_TEMPLATE', () => {
    it('should set selected template and reset everything else', () => {
      const withData: FormState = {
        ...initialFormState,
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        validationError: 'duplicate',
        hasAttemptedSubmit: true,
      };

      const state = formReducer(withData, {
        type: 'SET_SELECTED_TEMPLATE',
        payload: 'template-1',
      });

      expect(state).toEqual({
        ...initialFormState,
        selectedTemplate: 'template-1',
      });
    });
  });

  describe('SET_STREAM_NAME', () => {
    it('should set stream name', () => {
      const state = formReducer(initialFormState, {
        type: 'SET_STREAM_NAME',
        payload: 'test-stream',
      });

      expect(state.streamName).toBe('test-stream');
    });
  });

  describe('SET_SELECTED_INDEX_PATTERN', () => {
    it('should set index pattern and reset validation state', () => {
      const withValidationError: FormState = {
        ...initialFormState,
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        validationError: 'duplicate',
        hasAttemptedSubmit: true,
        isValidating: true,
      };

      const state = formReducer(withValidationError, {
        type: 'SET_SELECTED_INDEX_PATTERN',
        payload: 'logs-*',
      });

      expect(state).toEqual({
        ...initialFormState,
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
      });
    });
  });

  describe('START_CREATE_VALIDATION', () => {
    it('should start create validation', () => {
      const state = formReducer(initialFormState, {
        type: 'START_CREATE_VALIDATION',
      });

      expect(state.isSubmitting).toBe(true);
      expect(state.isValidating).toBe(true);
      expect(state.hasAttemptedSubmit).toBe(true);
    });
  });

  describe('START_DEBOUNCED_VALIDATION', () => {
    it('should start debounced validation', () => {
      const state = formReducer(initialFormState, {
        type: 'START_DEBOUNCED_VALIDATION',
      });

      expect(state.isValidating).toBe(true);
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('COMPLETE_VALIDATION', () => {
    it('should complete validation with success', () => {
      const validating: FormState = {
        ...initialFormState,
        isSubmitting: true,
        isValidating: true,
      };

      const state = formReducer(validating, {
        type: 'COMPLETE_VALIDATION',
        payload: {
          errorType: null,
          conflictingIndexPattern: undefined,
        },
      });

      expect(state.validationError).toBe(null);
      expect(state.conflictingIndexPattern).toBeUndefined();
      expect(state.isValidating).toBe(false);
      expect(state.isSubmitting).toBe(false);
    });

    it('should complete validation with error', () => {
      const validating: FormState = {
        ...initialFormState,
        isSubmitting: true,
        isValidating: true,
      };

      const state = formReducer(validating, {
        type: 'COMPLETE_VALIDATION',
        payload: {
          errorType: 'duplicate',
          conflictingIndexPattern: 'logs-*',
        },
      });

      expect(state.validationError).toBe('duplicate');
      expect(state.conflictingIndexPattern).toBe('logs-*');
      expect(state.isValidating).toBe(false);
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('ABORT_VALIDATION', () => {
    it('should abort validation', () => {
      const validating: FormState = {
        ...initialFormState,
        isValidating: true,
        isSubmitting: true,
      };

      const state = formReducer(validating, {
        type: 'ABORT_VALIDATION',
      });

      expect(state.isValidating).toBe(false);
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('CLEAR_VALIDATION_ERROR', () => {
    it('should clear validation error', () => {
      const withError: FormState = {
        ...initialFormState,
        validationError: 'duplicate',
        conflictingIndexPattern: 'logs-*',
      };

      const state = formReducer(withError, {
        type: 'CLEAR_VALIDATION_ERROR',
      });

      expect(state.validationError).toBe(null);
      expect(state.conflictingIndexPattern).toBeUndefined();
    });
  });

  describe('RESET_VALIDATION', () => {
    it('should reset validation state while preserving form inputs', () => {
      const withState: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        isSubmitting: true,
        isValidating: true,
        hasAttemptedSubmit: true,
        validationError: 'duplicate',
        conflictingIndexPattern: 'logs-*',
      };

      const state = formReducer(withState, {
        type: 'RESET_VALIDATION',
      });

      expect(state).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        isSubmitting: false,
        isValidating: false,
        hasAttemptedSubmit: false,
        validationError: null,
        conflictingIndexPattern: undefined,
      });
    });
  });

  describe('RESET_FORM', () => {
    it('should reset to initial state', () => {
      const withState: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        isSubmitting: true,
        isValidating: true,
        hasAttemptedSubmit: true,
        validationError: 'duplicate',
        conflictingIndexPattern: 'logs-*',
      };

      const state = formReducer(withState, {
        type: 'RESET_FORM',
      });

      expect(state).toEqual(initialFormState);
    });
  });
});
