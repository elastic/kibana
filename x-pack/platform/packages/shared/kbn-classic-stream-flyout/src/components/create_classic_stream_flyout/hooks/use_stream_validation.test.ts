/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useReducer } from 'react';
import { useStreamValidation } from './use_stream_validation';
import type { StreamNameValidator } from '../../../utils';
import { formReducer, initialFormState } from '../reducers/form_reducer';

describe('useStreamValidation', () => {
  const mockOnCreate = jest.fn();
  const mockOnValidate: StreamNameValidator = jest.fn().mockResolvedValue({
    errorType: null,
  });

  // Helper to set up hook with form reducer
  const setupHook = (onValidate?: StreamNameValidator) => {
    return renderHook(() => {
      const [formState, dispatch] = useReducer(formReducer, {
        ...initialFormState,
        streamName: 'test-stream',
      });

      const { handleStreamNameChange, handleCreate } = useStreamValidation({
        formState,
        dispatch,
        onCreate: mockOnCreate,
        onValidate,
      });

      return {
        formState,
        dispatch,
        handleStreamNameChange,
        handleCreate,
      };
    });
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('WHEN initialized', () => {
    it('SHOULD return initial state', () => {
      const { result } = setupHook();

      expect(result.current.formState.validationError).toBe(null);
      expect(result.current.formState.conflictingIndexPattern).toBeUndefined();
      expect(result.current.formState.hasAttemptedSubmit).toBe(false);
      expect(result.current.formState.isValidating).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
    });
  });

  describe('WHEN handleStreamNameChange is called', () => {
    it('SHOULD skip validation if hasAttemptedSubmit is false', async () => {
      const { result } = setupHook(mockOnValidate);

      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      expect(mockOnValidate).not.toHaveBeenCalled();
      expect(result.current.formState.isValidating).toBe(false);
    });

    it('SHOULD trigger debounced validation after submit attempt', async () => {
      const { result } = setupHook(mockOnValidate);

      // First attempt submit
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Change name
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledWith('new-stream', expect.any(AbortSignal));
      });
    });

    it('SHOULD clear validation error when name changes after submit attempt', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = setupHook(mockOnValidateWithError);

      // First submit to get error
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(result.current.formState.validationError).toBe('duplicate');

      // Change name
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      expect(result.current.formState.validationError).toBe(null);
    });

    it('SHOULD skip if name has not changed', async () => {
      const { result } = setupHook(mockOnValidate);

      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      expect(mockOnValidate).not.toHaveBeenCalled();
    });

    it('SHOULD abort Create validation when name changes during Create', async () => {
      const slowValidator: StreamNameValidator = jest.fn().mockImplementation(async (_, signal) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (signal?.aborted) {
          throw new Error('Aborted');
        }
        return { errorType: null };
      });

      const { result } = setupHook(slowValidator);

      // Initialize lastStreamNameRef by calling handleStreamNameChange first
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      // Start Create
      let createPromise = Promise.resolve();
      act(() => {
        createPromise = result.current.handleCreate();
      });

      // Change name to abort Create
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // After changing name: isSubmitting should be false (Create aborted), isValidating should be true (debounced validation)
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(result.current.formState.isValidating).toBe(true);

      // Advance timers to let the aborted Create validation complete
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });

      await act(async () => {
        await createPromise;
      });

      // After abort, onCreate should not have been called
      expect(mockOnCreate).not.toHaveBeenCalled();

      // Now let debounced validation run
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      await waitFor(() => {
        expect(slowValidator).toHaveBeenCalledWith('new-stream', expect.any(AbortSignal));
      });
    });
  });

  describe('WHEN handleCreate is called', () => {
    it('SHOULD validate and call onCreate on success', async () => {
      const { result } = setupHook(mockOnValidate);

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(mockOnValidate).toHaveBeenCalledWith('test-stream', expect.any(AbortSignal));
      expect(mockOnCreate).toHaveBeenCalledWith('test-stream');
      expect(result.current.formState.hasAttemptedSubmit).toBe(true);
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(result.current.formState.isValidating).toBe(false);
    });

    it('SHOULD set validation error and not call onCreate on validation failure', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = setupHook(mockOnValidateWithError);

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(result.current.formState.validationError).toBe('duplicate');
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('SHOULD handle empty wildcard error', async () => {
      const { result } = renderHook(() => {
        const [formState, dispatch] = useReducer(formReducer, {
          ...initialFormState,
          selectedTemplate: 'logs-*',
          selectedIndexPattern: 'logs-*',
          streamName: 'logs-*', // Contains wildcard - triggers 'empty' error
        });

        const { handleCreate } = useStreamValidation({
          formState,
          dispatch,
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        });

        return { formState, handleCreate };
      });

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(result.current.formState.validationError).toBe('empty');
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('SHOULD handle higherPriority error with conflicting pattern', async () => {
      const mockOnValidateHigherPriority: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'higherPriority',
        conflictingIndexPattern: 'logs-*',
      });

      const { result } = setupHook(mockOnValidateHigherPriority);

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(result.current.formState.validationError).toBe('higherPriority');
      expect(result.current.formState.conflictingIndexPattern).toBe('logs-*');
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('SHOULD cancel debounced validation when Create is called', async () => {
      const { result } = setupHook(mockOnValidate);

      // First submit attempt
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Change name to schedule debounced validation
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Verify isValidating is true (debounced validation scheduled)
      expect(result.current.formState.isValidating).toBe(true);

      // Immediately call Create to cancel debounced validation before it executes
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Debounced validator should not have been called (only Create validator)
      expect(mockOnValidate).toHaveBeenCalledTimes(2); // Once for first submit, once for Create
      expect(mockOnValidate).toHaveBeenLastCalledWith('new-stream', expect.any(AbortSignal));
    });

    it('SHOULD handle validation errors gracefully', async () => {
      const errorValidator: StreamNameValidator = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = setupHook(errorValidator);

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Validation error:', expect.any(Error));
      expect(mockOnCreate).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('SHOULD abort validation when signal is aborted', async () => {
      const slowValidator: StreamNameValidator = jest
        .fn()
        .mockImplementation(async (name, signal) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (signal?.aborted) {
            throw new Error('Aborted');
          }
          return { errorType: null };
        });

      const { result } = setupHook(slowValidator);

      // Initialize lastStreamNameRef
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      // Start Create
      let createPromise = Promise.resolve();
      act(() => {
        createPromise = result.current.handleCreate();
      });

      // Change name to abort Create
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
        await createPromise;
      });

      // onCreate should not be called
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('WHEN rapid name changes occur', () => {
    it('SHOULD only validate the final name', async () => {
      const { result } = setupHook(mockOnValidate);

      // Trigger submit to enable live validation
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Clear previous calls
      jest.mocked(mockOnValidate).mockClear();

      // Rapid name changes
      act(() => {
        result.current.handleStreamNameChange('initial');
      });
      act(() => {
        result.current.handleStreamNameChange('intermediate');
      });
      act(() => {
        result.current.handleStreamNameChange('final');
      });

      // Wait for debounce
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledWith('final', expect.any(AbortSignal));
      });

      // Should only validate final name
      expect(mockOnValidate).toHaveBeenCalledTimes(1);
    });

    it('SHOULD abort previous debounced validation when name changes', async () => {
      const { result } = setupHook(mockOnValidate);

      // Trigger submit
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(result.current.formState.hasAttemptedSubmit).toBe(true);

      // Change name
      act(() => {
        result.current.handleStreamNameChange('first');
      });

      // Wait less than debounce time
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // Change name again (should abort previous)
      act(() => {
        result.current.handleStreamNameChange('second');
      });

      // Complete the debounce
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledWith('second', expect.any(AbortSignal));
      });

      // Only the second validation should have completed
      expect(mockOnValidate).toHaveBeenCalledTimes(2); // Once for initial submit, once for 'second'
    });
  });

  describe('WHEN debounce delay is configured', () => {
    it('SHOULD use custom debounce delay', async () => {
      const { result } = renderHook(() => {
        const [formState, dispatch] = useReducer(formReducer, {
          ...initialFormState,
          streamName: 'test-stream',
        });

        const { handleCreate, handleStreamNameChange } = useStreamValidation({
          formState,
          dispatch,
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
          debounceMs: 500, // Custom delay
        });

        return { formState, handleCreate, handleStreamNameChange };
      });

      // Trigger submit
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      jest.mocked(mockOnValidate).mockClear();

      // Change name
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Wait for custom delay minus 100ms
      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });

      // Should not have validated yet
      expect(mockOnValidate).not.toHaveBeenCalled();

      // Now wait for debounced validation to trigger after full delay
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledTimes(1);
      });
    });
  });
});
