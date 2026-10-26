/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useReducer } from 'react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';

import { useStreamValidation } from './use_stream_validation';
import type { StreamNameValidator } from '../../../utils';
import { formReducer, initialFormState } from '../reducers/form_reducer';

describe('useStreamValidation', () => {
  const mockOnCreate = jest.fn().mockResolvedValue(undefined);
  const mockOnValidate: StreamNameValidator = jest.fn().mockResolvedValue({
    errorType: null,
  });

  const mockTemplate: IndexTemplate = {
    name: 'test-template',
    indexPatterns: ['logs-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
    hasSettings: false,
    hasAliases: false,
    hasMappings: false,
  };

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
        selectedTemplate: mockTemplate,
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

      expect(result.current.formState.validation).toEqual({
        mode: 'idle',
        isValidating: false,
        validationError: null,
        conflictingIndexPattern: undefined,
      });
    });
  });

  describe('WHEN handleStreamNameChange is called', () => {
    it('SHOULD skip validation in IDLE mode', async () => {
      const { result } = setupHook(mockOnValidate);

      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      expect(mockOnValidate).not.toHaveBeenCalled();
      expect(result.current.formState.validation.isValidating).toBe(false);
    });

    it('SHOULD NOT trigger validation after Create completes (returns to IDLE)', async () => {
      const { result } = setupHook(mockOnValidate);

      // Create completes successfully - returns to IDLE mode
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Should be in IDLE mode now
      expect(result.current.formState.validation.mode).toBe('idle');

      // Change name after Create - should NOT trigger validation (IDLE mode)
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Should not be validating
      expect(result.current.formState.validation.isValidating).toBe(false);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Should NOT trigger validation
      expect(mockOnValidate).toHaveBeenCalledTimes(1); // Only Create validation
      expect(mockOnValidate).not.toHaveBeenCalledWith(
        'new-stream',
        mockTemplate,
        expect.any(AbortSignal)
      );
    });

    it('SHOULD trigger debounced validation in Live Validation Mode (has error)', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = setupHook(mockOnValidateWithError);

      // First submit to get error - enters Live Validation Mode
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Validation error should be set immediately after awaiting
      expect(result.current.formState.validation.validationError).toBe('duplicate');

      // Change name in Live Validation Mode
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Should trigger debounced validation (in Live Validation Mode)
      await waitFor(() => {
        expect(mockOnValidateWithError).toHaveBeenCalledWith(
          'new-stream',
          mockTemplate,
          expect.any(AbortSignal)
        );
      });
    });

    it('SHOULD keep validation error visible and trigger debounced validation in Live Validation Mode', async () => {
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

      // Wait for validation to complete and error to be set
      await waitFor(() => {
        expect(result.current.formState.validation.validationError).toBe('duplicate');
      });

      // Change name in Live Validation Mode
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Validation error should stay visible (not cleared) while validating
      expect(result.current.formState.validation.validationError).toBe('duplicate');
      expect(result.current.formState.validation.isValidating).toBe(true);

      // Advance timers to trigger debounced validation
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Debounced validation should have been triggered
      await waitFor(() => {
        expect(mockOnValidateWithError).toHaveBeenCalledWith(
          'new-stream',
          mockTemplate,
          expect.any(AbortSignal)
        );
      });
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

    it('SHOULD abort Create validation and return to IDLE when name changes during Create', async () => {
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

      // Verify we're in CREATE mode
      expect(result.current.formState.validation.mode).toBe('create');
      expect(result.current.formState.validation.isValidating).toBe(true);

      // Change name to abort Create
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // After changing name: should return to IDLE (no loader, no validation)
      expect(result.current.formState.validation.mode).toBe('idle');
      expect(result.current.formState.validation.isValidating).toBe(false);

      // Advance timers to let the aborted Create validation complete
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });

      await act(async () => {
        await createPromise;
      });

      // After abort, onCreate should not have been called
      expect(mockOnCreate).not.toHaveBeenCalled();

      // Advance debounce timers - no validation should trigger (we're in IDLE)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Only the initial Create validation should have been called
      expect(slowValidator).toHaveBeenCalledTimes(1);
      expect(slowValidator).toHaveBeenCalledWith(
        'test-stream',
        mockTemplate,
        expect.any(AbortSignal)
      );

      // Should still be in IDLE mode with no validation
      expect(result.current.formState.validation.mode).toBe('idle');
      expect(result.current.formState.validation.isValidating).toBe(false);
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

      expect(mockOnValidate).toHaveBeenCalledWith(
        'test-stream',
        mockTemplate,
        expect.any(AbortSignal)
      );
      expect(mockOnCreate).toHaveBeenCalledWith('test-stream');
      expect(result.current.formState.validation.mode).toBe('idle'); // Success returns to IDLE
      expect(result.current.formState.validation.isValidating).toBe(false);
    });

    it('SHOULD set isSubmitting to true while onCreate is running and false after', async () => {
      let resolveOnCreate: () => void;
      const slowOnCreate = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveOnCreate = resolve;
          })
      );

      const { result } = renderHook(() => {
        const [formState, dispatch] = useReducer(formReducer, {
          ...initialFormState,
          streamName: 'test-stream',
        });

        const { handleCreate } = useStreamValidation({
          formState,
          dispatch,
          onCreate: slowOnCreate,
          selectedTemplate: mockTemplate,
          onValidate: mockOnValidate,
        });

        return { formState, handleCreate };
      });

      // Start create
      let createPromise: Promise<void>;
      await act(async () => {
        createPromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
      });

      // isSubmitting should be true while onCreate is running
      expect(result.current.formState.isSubmitting).toBe(true);
      expect(slowOnCreate).toHaveBeenCalledWith('test-stream');

      // Resolve onCreate
      await act(async () => {
        resolveOnCreate!();
        await createPromise!;
      });

      // isSubmitting should be false after onCreate completes
      expect(result.current.formState.isSubmitting).toBe(false);
    });

    it('SHOULD set isSubmitting to false even if onCreate throws an error', async () => {
      // onCreate handles its own errors, the hook just needs to reset isSubmitting
      const failingOnCreate = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Create failed'));
      });

      const { result } = renderHook(() => {
        const [formState, dispatch] = useReducer(formReducer, {
          ...initialFormState,
          streamName: 'test-stream',
        });

        const { handleCreate } = useStreamValidation({
          formState,
          dispatch,
          onCreate: failingOnCreate,
          selectedTemplate: mockTemplate,
          onValidate: mockOnValidate,
        });

        return { formState, handleCreate };
      });

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        // Error is swallowed - onCreate is expected to handle its own errors
        await handleCreatePromise;
      });

      // isSubmitting should be false even after error
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(failingOnCreate).toHaveBeenCalledWith('test-stream');
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

      expect(result.current.formState.validation.validationError).toBe('duplicate');
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
          selectedTemplate: mockTemplate,
          onValidate: mockOnValidate,
        });

        return { formState, handleCreate };
      });

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      expect(result.current.formState.validation.validationError).toBe('empty');
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

      expect(result.current.formState.validation.validationError).toBe('higherPriority');
      expect(result.current.formState.validation.conflictingIndexPattern).toBe('logs-*');
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('SHOULD cancel debounced validation when Create is called in Live Validation Mode', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = setupHook(mockOnValidateWithError);

      // First submit to get error - enters Live Validation Mode
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Wait for error to be set
      await waitFor(() => {
        expect(result.current.formState.validation.validationError).toBe('duplicate');
      });

      // Change name to schedule debounced validation (Live Validation Mode)
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Verify isValidating is true (debounced validation scheduled)
      expect(result.current.formState.validation.isValidating).toBe(true);

      // Immediately call Create to cancel debounced validation before it executes
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Debounced validator should not have been called (only Create validators)
      expect(mockOnValidateWithError).toHaveBeenCalledTimes(2); // Once for first submit, once for second Create
      expect(mockOnValidateWithError).toHaveBeenLastCalledWith(
        'new-stream',
        mockTemplate,
        expect.any(AbortSignal)
      );
    });

    it('SHOULD handle validation errors gracefully', async () => {
      const errorValidator: StreamNameValidator = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const { result } = setupHook(errorValidator);

      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Should abort validation and not call onCreate
      expect(result.current.formState.validation.isValidating).toBe(false);
      expect(mockOnCreate).not.toHaveBeenCalled();
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

  describe('WHEN rapid name changes occur in Live Validation Mode', () => {
    it('SHOULD only validate the final name', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = setupHook(mockOnValidateWithError);

      // Trigger submit to get error and enter Live Validation Mode
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Validation error should be set
      expect(result.current.formState.validation.validationError).toBe('duplicate');

      // Clear previous calls
      jest.mocked(mockOnValidateWithError).mockClear();

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
        expect(mockOnValidateWithError).toHaveBeenCalledWith(
          'final',
          mockTemplate,
          expect.any(AbortSignal)
        );
      });

      // Should only validate final name
      expect(mockOnValidateWithError).toHaveBeenCalledTimes(1);
    });

    it('SHOULD abort previous debounced validation when name changes', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = setupHook(mockOnValidateWithError);

      // Trigger submit to get error
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Validation error should be set and mode should be LIVE
      expect(result.current.formState.validation.validationError).toBe('duplicate');
      expect(result.current.formState.validation.mode).toBe('live');

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
        expect(mockOnValidateWithError).toHaveBeenCalledWith(
          'second',
          mockTemplate,
          expect.any(AbortSignal)
        );
      });

      // Only the second validation should have completed
      expect(mockOnValidateWithError).toHaveBeenCalledTimes(2); // Once for initial submit, once for 'second'
    });
  });

  describe('WHEN debounce delay is configured', () => {
    it('SHOULD use custom debounce delay in Live Validation Mode', async () => {
      const mockOnValidateWithError: StreamNameValidator = jest.fn().mockResolvedValue({
        errorType: 'duplicate',
      });

      const { result } = renderHook(() => {
        const [formState, dispatch] = useReducer(formReducer, {
          ...initialFormState,
          streamName: 'test-stream',
        });

        const { handleCreate, handleStreamNameChange } = useStreamValidation({
          formState,
          dispatch,
          onCreate: mockOnCreate,
          selectedTemplate: mockTemplate,
          onValidate: mockOnValidateWithError,
          debounceMs: 500, // Custom delay
        });

        return { formState, handleCreate, handleStreamNameChange };
      });

      // Trigger submit to get error
      await act(async () => {
        const handleCreatePromise = result.current.handleCreate();
        await jest.runOnlyPendingTimersAsync();
        await handleCreatePromise;
      });

      // Validation error should be set
      expect(result.current.formState.validation.validationError).toBe('duplicate');

      // Clear mock calls
      jest.mocked(mockOnValidateWithError).mockClear();

      // Change name
      act(() => {
        result.current.handleStreamNameChange('new-stream');
      });

      // Wait for custom delay minus 100ms
      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });

      // Should not have validated yet
      expect(mockOnValidateWithError).not.toHaveBeenCalled();

      // Now wait for debounced validation to trigger after full delay
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      await waitFor(() => {
        expect(mockOnValidateWithError).toHaveBeenCalledTimes(1);
      });
    });
  });
});
