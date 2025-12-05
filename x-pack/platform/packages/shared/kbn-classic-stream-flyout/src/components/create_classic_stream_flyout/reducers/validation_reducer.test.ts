/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validationReducer,
  initialValidationState,
  type ValidationState,
} from './validation_reducer';

describe('validationReducer', () => {
  describe('initial state', () => {
    it('should return initial state', () => {
      expect(initialValidationState).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });
  });

  describe('SET_VALIDATION_ERROR', () => {
    it('should set validation error to null', () => {
      const state: ValidationState = {
        validationError: 'duplicate',
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: true,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_VALIDATION_ERROR',
        payload: null,
      });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: true,
        isValidating: false,
      });
    });

    it('should set validation error to duplicate', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_VALIDATION_ERROR',
        payload: 'duplicate',
      });

      expect(result).toEqual({
        validationError: 'duplicate',
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });

    it('should set validation error to higherPriority', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_VALIDATION_ERROR',
        payload: 'higherPriority',
      });

      expect(result).toEqual({
        validationError: 'higherPriority',
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });

    it('should set validation error to empty', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_VALIDATION_ERROR',
        payload: 'empty',
      });

      expect(result).toEqual({
        validationError: 'empty',
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });
  });

  describe('SET_CONFLICTING_INDEX_PATTERN', () => {
    it('should set conflicting index pattern', () => {
      const state: ValidationState = {
        validationError: 'higherPriority',
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: true,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_CONFLICTING_INDEX_PATTERN',
        payload: 'logs-*',
      });

      expect(result).toEqual({
        validationError: 'higherPriority',
        conflictingIndexPattern: 'logs-*',
        hasAttemptedSubmit: true,
        isValidating: false,
      });
    });

    it('should clear conflicting index pattern', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: 'logs-*',
        hasAttemptedSubmit: true,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_CONFLICTING_INDEX_PATTERN',
        payload: undefined,
      });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: true,
        isValidating: false,
      });
    });
  });

  describe('SET_HAS_ATTEMPTED_SUBMIT', () => {
    it('should set hasAttemptedSubmit to true', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_HAS_ATTEMPTED_SUBMIT',
        payload: true,
      });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: true,
        isValidating: false,
      });
    });

    it('should set hasAttemptedSubmit to false', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: true,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_HAS_ATTEMPTED_SUBMIT',
        payload: false,
      });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });
  });

  describe('SET_IS_VALIDATING', () => {
    it('should set isValidating to true', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      };

      const result = validationReducer(state, {
        type: 'SET_IS_VALIDATING',
        payload: true,
      });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: true,
      });
    });

    it('should set isValidating to false', () => {
      const state: ValidationState = {
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: true,
      };

      const result = validationReducer(state, {
        type: 'SET_IS_VALIDATING',
        payload: false,
      });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });
  });

  describe('RESET_VALIDATION', () => {
    it('should reset validation state but keep isValidating', () => {
      const state: ValidationState = {
        validationError: 'duplicate',
        conflictingIndexPattern: 'logs-*',
        hasAttemptedSubmit: true,
        isValidating: true,
      };

      const result = validationReducer(state, { type: 'RESET_VALIDATION' });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: true, // Should keep isValidating state
      });
    });

    it('should reset validation state completely', () => {
      const state: ValidationState = {
        validationError: 'higherPriority',
        conflictingIndexPattern: 'metrics-*',
        hasAttemptedSubmit: true,
        isValidating: false,
      };

      const result = validationReducer(state, { type: 'RESET_VALIDATION' });

      expect(result).toEqual({
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
        isValidating: false,
      });
    });
  });

  describe('unknown action', () => {
    it('should return state unchanged for unknown action', () => {
      const state: ValidationState = {
        validationError: 'duplicate',
        conflictingIndexPattern: 'logs-*',
        hasAttemptedSubmit: true,
        isValidating: false,
      };

      const result = validationReducer(state, { type: 'UNKNOWN_ACTION' } as any);

      expect(result).toEqual(state);
    });
  });
});
