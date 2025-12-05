/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreamValidation } from './use_stream_validation';
import type { StreamNameValidator } from '../../../utils';

describe('useStreamValidation', () => {
  const mockOnCreate = jest.fn();
  const mockOnValidate: StreamNameValidator = jest.fn().mockResolvedValue({
    errorType: null,
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Aggressively flush all pending timers and operations to prevent leaks between tests
    await act(async () => {
      try {
        // Try to run all pending timers
        await jest.runAllTimersAsync();
      } catch (e) {
        // If that fails (infinite loop), just run pending ones
        await jest.runOnlyPendingTimersAsync();
      }
      // Flush any remaining microtasks
      await Promise.resolve();
    });
  });

  describe('WHEN initialized', () => {
    it('SHOULD return initial state', () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
        })
      );

      expect(result.current.validationError).toBe(null);
      expect(result.current.conflictingIndexPattern).toBeUndefined();
      expect(result.current.hasAttemptedSubmit).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('WHEN handleStreamNameChange is called', () => {
    it('SHOULD skip validation if hasAttemptedSubmit is false', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      expect(mockOnValidate).not.toHaveBeenCalled();
      expect(result.current.isValidating).toBe(false);
    });

    it('SHOULD trigger debounced validation after submit attempt', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      // First attempt submit
      await act(async () => {
        await result.current.handleCreate();
      });

      // Change name
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      expect(result.current.isValidating).toBe(true);

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledWith('new-stream', expect.any(AbortSignal));
      });
    });

    it('SHOULD clear validation error when name changes after submit attempt', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidateWithError,
        })
      );

      // Submit with error
      await act(async () => {
        await result.current.handleCreate();
      });

      expect(result.current.validationError).toBe('duplicate');

      // Change name
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      expect(result.current.validationError).toBe(null);
    });

    it('SHOULD skip if name has not changed', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      // First, set the initial name so lastStreamNameRef is initialized
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      // Attempt submit - capture reference before async
      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      // Ensure validation is complete
      expect(result.current.isValidating).toBe(false);
      expect(result.current.hasAttemptedSubmit).toBe(true);

      // Change to same name - should not trigger validation
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      // Advance timers to ensure no debounced validation is triggered
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Should still not be validating since name didn't change
      expect(result.current.isValidating).toBe(false);
      // onValidate should not have been called again
      expect(mockOnValidate).toHaveBeenCalledTimes(1);
    });

    it('SHOULD abort Create validation when name changes during Create', async () => {
      // Use a slow validator so Create validation is still in progress when we change the name
      const slowValidator: StreamNameValidator = jest
        .fn()
        .mockImplementation(async (name, signal) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (signal?.aborted) {
            throw new Error('Aborted');
          }
          return { errorType: null };
        });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: slowValidator,
        })
      );

      // First, set the initial name so lastStreamNameRef is initialized
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      const handleCreate = result.current.handleCreate;

      // Start Create validation
      let createPromise: Promise<void> = Promise.resolve();
      act(() => {
        createPromise = handleCreate();
      });

      // Check that Create validation started (isSubmitting should be true, isValidating should be true)
      expect(result.current.isSubmitting).toBe(true);
      expect(result.current.isValidating).toBe(true);
      expect(result.current.hasAttemptedSubmit).toBe(true);

      // Now change name while Create validation is still in progress
      // This should abort Create validation and trigger debounced validation
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // After changing name: isSubmitting should be false (Create aborted), isValidating should be true (debounced validation)
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isValidating).toBe(true);

      // Advance timers to let the aborted Create validation complete
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      await createPromise;

      // onCreate should not be called because Create was aborted
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('WHEN handleCreate is called', () => {
    it('SHOULD validate and call onCreate on success', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'valid-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(mockOnValidate).toHaveBeenCalledWith('valid-stream', expect.any(AbortSignal));
      expect(mockOnCreate).toHaveBeenCalledWith('valid-stream');
      expect(result.current.hasAttemptedSubmit).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isValidating).toBe(false);
    });

    it('SHOULD set validation error and not call onCreate on validation failure', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'duplicate-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidateWithError,
        })
      );

      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(mockOnValidateWithError).toHaveBeenCalled();
      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(result.current.validationError).toBe('duplicate');
      expect(result.current.hasAttemptedSubmit).toBe(true);
    });

    it('SHOULD handle empty wildcard error', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'stream-with-*',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(result.current.validationError).toBe('empty');
    });

    it('SHOULD handle higherPriority error with conflicting pattern', async () => {
      const mockOnValidateWithPriority: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'higherPriority',
        conflictingIndexPattern: 'logs-*-higher-priority',
      });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'logs-lower-priority',
          onCreate: mockOnCreate,
          onValidate: mockOnValidateWithPriority,
        })
      );

      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(result.current.validationError).toBe('higherPriority');
      expect(result.current.conflictingIndexPattern).toBe('logs-*-higher-priority');
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('SHOULD cancel debounced validation when Create is called', async () => {
      // Use a slow validator so Create validation stays in progress when we advance timers
      const slowValidator: StreamNameValidator = jest
        .fn()
        .mockImplementation(async (name, signal) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return { errorType: null };
        });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: slowValidator,
        })
      );

      // First, set the initial name so lastStreamNameRef is initialized
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      // Attempt submit first - capture reference before async
      const handleCreate = result.current.handleCreate;

      // Advance timers to complete first Create validation
      await act(async () => {
        const createPromise = handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await createPromise;
      });

      // Verify initial call count and hasAttemptedSubmit is true
      expect(slowValidator).toHaveBeenCalledTimes(1); // Only first Create
      expect(result.current.hasAttemptedSubmit).toBe(true);

      // Change name to trigger debounced validation (but don't advance timers yet)
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Verify isValidating is true (debounced validation scheduled)
      expect(result.current.isValidating).toBe(true);

      // Immediately call Create to cancel debounced validation before it executes
      await act(async () => {
        const createPromise = handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await createPromise;
      });

      // Should only validate for Create (twice), not debounced validation
      expect(slowValidator).toHaveBeenCalledTimes(2); // Once for first Create, once for second Create
      // Verify both calls were with 'test-stream' (the prop value), not 'new-stream'
      expect(slowValidator).toHaveBeenNthCalledWith(1, 'test-stream', expect.any(AbortSignal));
      expect(slowValidator).toHaveBeenNthCalledWith(2, 'test-stream', expect.any(AbortSignal));
    });

    it('SHOULD handle validation errors gracefully', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidateWithError,
        })
      );

      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Validation error:', expect.any(Error));
      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);

      consoleSpy.mockRestore();
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

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: slowValidator,
        })
      );

      // First, set the initial name so lastStreamNameRef is initialized
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      // Capture function references before async operations
      const handleCreate = result.current.handleCreate;
      const handleStreamNameChange = result.current.handleStreamNameChange;

      // Start Create
      let createPromise: Promise<void> = Promise.resolve();
      act(() => {
        createPromise = handleCreate();
      });

      // Change name to abort Create
      act(() => {
        handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      await createPromise;

      // onCreate should not be called
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('WHEN resetOnTemplateChange is called', () => {
    it('SHOULD reset all validation state', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidateWithError,
        })
      );

      // Create with error - capture reference before async
      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(result.current.hasAttemptedSubmit).toBe(true);
      expect(result.current.validationError).toBe('duplicate');

      // Reset
      act(() => {
        result.current.resetOnTemplateChange();
      });

      expect(result.current.hasAttemptedSubmit).toBe(false);
      expect(result.current.validationError).toBe(null);
      expect(result.current.conflictingIndexPattern).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('WHEN resetOnIndexPatternChange is called', () => {
    it('SHOULD reset all validation state', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      expect(result.current.hasAttemptedSubmit).toBe(true);

      act(() => {
        result.current.resetOnIndexPatternChange();
      });

      expect(result.current.hasAttemptedSubmit).toBe(false);
    });
  });

  describe('WHEN rapid name changes occur', () => {
    it('SHOULD only validate the final name', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'initial',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
        })
      );

      // Attempt submit first - capture reference before async
      const handleCreate = result.current.handleCreate;
      await act(async () => {
        await handleCreate();
      });

      // Complete the initial Create validation so hasAttemptedSubmit is true
      // and isCreateValidationInProgressRef is cleared before debounced validation runs
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Rapid changes
      act(() => {
        result.current.handleStreamNameChange('change1');
      });
      act(() => {
        result.current.handleStreamNameChange('change2');
      });
      act(() => {
        result.current.handleStreamNameChange('final');
      });

      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledWith('final', expect.any(AbortSignal));
      });

      // Should only validate final name
      const calls = jest
        .mocked(mockOnValidate)
        .mock.calls.filter((call) => call[0].startsWith('change'));
      expect(calls.length).toBe(0);
    });

    it('SHOULD abort previous debounced validation when name changes', async () => {
      const validatorCalls: string[] = [];
      const mockValidator: StreamNameValidator = jest
        .fn()
        .mockImplementation(async (name, signal) => {
          validatorCalls.push(name);
          // Use a single setTimeout like the original test
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Check abort signal AFTER the delay (like the original test)
          if (signal?.aborted) {
            throw new Error('Aborted');
          }
          return { errorType: null };
        });

      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'initial',
          onCreate: mockOnCreate,
          onValidate: mockValidator,
          debounceMs: 100,
        })
      );

      // First, set the initial name so lastStreamNameRef is initialized
      act(() => {
        result.current.handleStreamNameChange('initial');
      });

      // Attempt submit first - capture reference before async
      const handleCreate = result.current.handleCreate;
      await act(async () => {
        const createPromise = handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await createPromise;
      });
      expect(result.current.hasAttemptedSubmit).toBe(true);

      // Change name
      act(() => {
        result.current.handleStreamNameChange('first');
      });

      // Ensure a debounced validation timer was scheduled
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // Change name again before the first debounced validation executes - this should cancel 'first'
      // because lastStreamNameRef will no longer match when the timer fires
      act(() => {
        result.current.handleStreamNameChange('second');
      });

      // Advance timer to trigger the debounced validation for 'second' (100ms debounce)
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Verify debounced validation only ran for the latest name
      expect(validatorCalls).not.toContain('first');
      expect(validatorCalls).toContain('second');
      expect(result.current.isValidating).toBe(true); // Should still be validating

      // Advance timers to resolve validator promises (500ms setTimeout in validator)
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Debug assertion to surface the current state instead of timing out
      expect({
        isValidating: result.current.isValidating,
        validatorCalls,
      }).toEqual({
        isValidating: false,
        validatorCalls: expect.arrayContaining(['second']),
      });

      // Both validations should have been started (first aborted, second completed)
      expect(validatorCalls).toContain('second');
    });
  });

  describe('WHEN debounce delay is configured', () => {
    it('SHOULD use custom debounce delay', async () => {
      const { result } = renderHook(() =>
        useStreamValidation({
          streamName: 'test-stream',
          onCreate: mockOnCreate,
          onValidate: mockOnValidate,
          debounceMs: 500,
        })
      );

      // First, set the initial name so lastStreamNameRef is initialized
      act(() => {
        result.current.handleStreamNameChange('test-stream');
      });

      await act(async () => {
        await result.current.handleCreate();
      });

      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Advance time but not enough to trigger debounced validation (custom debounceMs = 500)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Should not validate before debounce delay
      expect(mockOnValidate).toHaveBeenCalledTimes(1); // Only Create validation

      // Now wait for debounced validation to trigger after full delay
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });
      await waitFor(() => {
        expect(mockOnValidate).toHaveBeenCalledTimes(2);
      });
    });
  });
});
