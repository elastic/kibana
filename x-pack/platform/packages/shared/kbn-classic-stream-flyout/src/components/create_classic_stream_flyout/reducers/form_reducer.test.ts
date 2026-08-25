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
        isSubmitting: true,
        validation: {
          mode: 'live',
          isValidating: false,
          validationError: 'duplicate',
          conflictingIndexPattern: undefined,
        },
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

  describe('SET_STREAM_NAME_PARTS', () => {
    it('should set stream name parts', () => {
      const state = formReducer(initialFormState, {
        type: 'SET_STREAM_NAME_PARTS',
        payload: ['foo', 'bar'],
      });

      expect(state.streamNameParts).toEqual(['foo', 'bar']);
    });
  });

  describe('SET_SELECTED_INDEX_PATTERN', () => {
    it('should set index pattern and reset validation state and parts', () => {
      const withValidationError: FormState = {
        ...initialFormState,
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        streamNameParts: ['old', 'parts'],
        validation: {
          mode: 'live',
          isValidating: true,
          validationError: 'duplicate',
          conflictingIndexPattern: undefined,
        },
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
        streamNameParts: [], // Should be reset
      });
    });
  });

  describe('START_CREATE_VALIDATION', () => {
    it('should start create validation', () => {
      const state = formReducer(initialFormState, {
        type: 'START_CREATE_VALIDATION',
      });

      expect(state.validation).toEqual({
        mode: 'create',
        isValidating: true,
        validationError: null,
        conflictingIndexPattern: undefined,
      });
    });
  });

  describe('START_DEBOUNCED_VALIDATION', () => {
    it('should start debounced validation in LIVE mode', () => {
      const inLiveMode: FormState = {
        ...initialFormState,
        validation: {
          mode: 'live',
          isValidating: false,
          validationError: 'duplicate',
          conflictingIndexPattern: undefined,
        },
      };

      const state = formReducer(inLiveMode, {
        type: 'START_DEBOUNCED_VALIDATION',
      });

      expect(state.validation).toEqual({
        mode: 'live',
        isValidating: true,
        validationError: 'duplicate',
        conflictingIndexPattern: undefined,
      });
    });

    it('should not change state if not in LIVE mode', () => {
      const state = formReducer(initialFormState, {
        type: 'START_DEBOUNCED_VALIDATION',
      });

      expect(state).toEqual(initialFormState);
    });
  });

  describe('COMPLETE_VALIDATION', () => {
    it('should complete validation with success and return to IDLE', () => {
      const validating: FormState = {
        ...initialFormState,
        validation: {
          mode: 'create',
          isValidating: true,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

      const state = formReducer(validating, {
        type: 'COMPLETE_VALIDATION',
        payload: {
          errorType: null,
          conflictingIndexPattern: undefined,
        },
      });

      expect(state.validation).toEqual({
        mode: 'idle',
        isValidating: false,
        validationError: null,
        conflictingIndexPattern: undefined,
      });
    });

    it('should complete validation with error and enter LIVE mode', () => {
      const validating: FormState = {
        ...initialFormState,
        validation: {
          mode: 'create',
          isValidating: true,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

      const state = formReducer(validating, {
        type: 'COMPLETE_VALIDATION',
        payload: {
          errorType: 'duplicate',
          conflictingIndexPattern: 'logs-*',
        },
      });

      expect(state.validation).toEqual({
        mode: 'live',
        isValidating: false,
        validationError: 'duplicate',
        conflictingIndexPattern: 'logs-*',
      });
    });
  });

  describe('ABORT_VALIDATION', () => {
    it('should abort validation and return to IDLE', () => {
      const validating: FormState = {
        ...initialFormState,
        validation: {
          mode: 'create',
          isValidating: true,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      };

      const state = formReducer(validating, {
        type: 'ABORT_VALIDATION',
      });

      expect(state.validation).toEqual({
        mode: 'idle',
        isValidating: false,
        validationError: null,
        conflictingIndexPattern: undefined,
      });
    });
  });

  describe('CLEAR_VALIDATION_ERROR', () => {
    it('should clear validation error', () => {
      const withError: FormState = {
        ...initialFormState,
        validation: {
          mode: 'live',
          isValidating: false,
          validationError: 'duplicate',
          conflictingIndexPattern: 'logs-*',
        },
      };

      const state = formReducer(withError, {
        type: 'CLEAR_VALIDATION_ERROR',
      });

      expect(state.validation).toEqual({
        mode: 'idle',
        isValidating: false,
        validationError: null,
        conflictingIndexPattern: undefined,
      });
    });
  });

  describe('RESET_VALIDATION', () => {
    it('should reset validation state while preserving form inputs', () => {
      const withState: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        streamNameParts: [],
        isSubmitting: false,
        validation: {
          mode: 'live',
          isValidating: true,
          validationError: 'duplicate',
          conflictingIndexPattern: 'logs-*',
        },
      };

      const state = formReducer(withState, {
        type: 'RESET_VALIDATION',
      });

      expect(state).toEqual({
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        streamNameParts: [],
        isSubmitting: false,
        validation: {
          mode: 'idle',
          isValidating: false,
          validationError: null,
          conflictingIndexPattern: undefined,
        },
      });
    });
  });

  describe('START_SUBMITTING', () => {
    it('should set isSubmitting to true', () => {
      const state = formReducer(initialFormState, {
        type: 'START_SUBMITTING',
      });

      expect(state.isSubmitting).toBe(true);
    });
  });

  describe('STOP_SUBMITTING', () => {
    it('should set isSubmitting to false', () => {
      const submitting: FormState = {
        ...initialFormState,
        isSubmitting: true,
      };

      const state = formReducer(submitting, {
        type: 'STOP_SUBMITTING',
      });

      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('RESET_FORM', () => {
    it('should reset to initial state', () => {
      const withState: FormState = {
        selectedTemplate: 'template-1',
        streamName: 'test-stream',
        selectedIndexPattern: 'logs-*',
        streamNameParts: [],
        isSubmitting: true,
        validation: {
          mode: 'live',
          isValidating: true,
          validationError: 'duplicate',
          conflictingIndexPattern: 'logs-*',
        },
      };

      const state = formReducer(withState, {
        type: 'RESET_FORM',
      });

      expect(state).toEqual(initialFormState);
    });
  });
});
