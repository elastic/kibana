/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useDebounceFn } from '@kbn/react-hooks';
import { validateStreamName, type StreamNameValidator } from '../../../utils';
import { useAbortController } from './use_abort_controller';
import {
  validationReducer,
  initialValidationState,
  type ValidationState,
} from '../reducers/validation_reducer';

const DEFAULT_VALIDATION_DEBOUNCE_MS = 300;

interface UseStreamValidationParams {
  streamName: string;
  onCreate: (streamName: string) => void;
  onValidate?: StreamNameValidator;
  debounceMs?: number;
}

interface UseStreamValidationReturn
  extends Pick<
    ValidationState,
    'validationError' | 'conflictingIndexPattern' | 'hasAttemptedSubmit' | 'isValidating'
  > {
  isSubmitting: boolean;
  handleStreamNameChange: (streamName: string) => void;
  handleCreate: () => Promise<void>;
  resetOnTemplateChange: () => void;
  resetOnIndexPatternChange: () => void;
}

export const useStreamValidation = ({
  streamName,
  onCreate,
  onValidate,
  debounceMs = DEFAULT_VALIDATION_DEBOUNCE_MS,
}: UseStreamValidationParams): UseStreamValidationReturn => {
  const [validationState, dispatchValidation] = useReducer(
    validationReducer,
    initialValidationState
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validationError, conflictingIndexPattern, hasAttemptedSubmit, isValidating } =
    validationState;

  const pendingValidationNamesRef = useRef<Set<string>>(new Set());
  const lastStreamNameRef = useRef<string>('');
  // Ref needed for closure in useDebounceFn
  const isSubmittingRef = useRef(false);

  const { getAbortController: getCreateAbortController, abort: abortCreateValidation } =
    useAbortController();
  const {
    getAbortController: getDebouncedAbortController,
    isAborted: isDebouncedAborted,
    abort: abortDebouncedValidation,
  } = useAbortController();

  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;

  const runDebouncedValidation = useCallback(
    async (name: string): Promise<boolean> => {
      const abortController = getDebouncedAbortController();
      dispatchValidation({ type: 'SET_IS_VALIDATING', payload: true });
      try {
        const result = await validateStreamName(
          name,
          onValidateRef.current,
          abortController.signal
        );
        if (isDebouncedAborted(abortController)) {
          return false;
        }
        dispatchValidation({ type: 'SET_VALIDATION_ERROR', payload: result.errorType });
        dispatchValidation({
          type: 'SET_CONFLICTING_INDEX_PATTERN',
          payload: result.conflictingIndexPattern,
        });
        return result.errorType === null;
      } catch (error) {
        if (isDebouncedAborted(abortController)) {
          return false;
        }
        // eslint-disable-next-line no-console
        console.error('Validation error:', error);
        return false;
      } finally {
        dispatchValidation({ type: 'SET_IS_VALIDATING', payload: false });
      }
    },
    [getDebouncedAbortController, isDebouncedAborted]
  );

  // Stable reference for debounced validation
  const runDebouncedValidationRef = useRef(runDebouncedValidation);
  runDebouncedValidationRef.current = runDebouncedValidation;

  const { run: runDebouncedValidationDebounced, cancel: cancelDebouncedValidation } = useDebounceFn(
    async (name: string) => {
      // Skip if name has changed since this validation was scheduled
      if (lastStreamNameRef.current !== name) {
        return;
      }
      if (pendingValidationNamesRef.current.has(name)) {
        return;
      }
      if (isSubmittingRef.current) {
        return;
      }
      pendingValidationNamesRef.current.add(name);
      try {
        const isValid = await runDebouncedValidationRef.current(name);
        if (isValid) {
          dispatchValidation({ type: 'SET_HAS_ATTEMPTED_SUBMIT', payload: false });
        }
      } finally {
        pendingValidationNamesRef.current.delete(name);
      }
    },
    { wait: debounceMs }
  );

  // Store debounced functions in refs to avoid recreating on every render
  const runDebouncedValidationDebouncedRef = useRef(runDebouncedValidationDebounced);
  runDebouncedValidationDebouncedRef.current = runDebouncedValidationDebounced;
  const cancelDebouncedValidationRef = useRef(cancelDebouncedValidation);
  cancelDebouncedValidationRef.current = cancelDebouncedValidation;

  const resetValidationState = useCallback(() => {
    abortCreateValidation();
    abortDebouncedValidation();
    cancelDebouncedValidationRef.current();
    dispatchValidation({ type: 'RESET_VALIDATION' });
    pendingValidationNamesRef.current.clear();
    isSubmittingRef.current = false;
  }, [abortCreateValidation, abortDebouncedValidation]);

  const handleStreamNameChange = useCallback(
    (newStreamName: string) => {
      // Skip if stream name hasn't actually changed
      if (newStreamName === lastStreamNameRef.current) {
        return;
      }

      // Check if name changed BEFORE updating the ref
      const hasNameChanged =
        lastStreamNameRef.current !== '' && newStreamName !== lastStreamNameRef.current;

      // If user changes input while Create validation is in progress, abort it
      // and transition to debounced validation mode
      if (isSubmittingRef.current && hasNameChanged) {
        isSubmittingRef.current = false;
        abortCreateValidation();
        setIsSubmitting(false);
        // Keep isValidating true to show loading state during debounced validation
      }

      // Update the ref after checking for changes
      lastStreamNameRef.current = newStreamName;

      if (hasAttemptedSubmit) {
        if (validationError !== null) {
          dispatchValidation({ type: 'SET_VALIDATION_ERROR', payload: null });
          dispatchValidation({ type: 'SET_CONFLICTING_INDEX_PATTERN', payload: undefined });
        }
        if (!pendingValidationNamesRef.current.has(newStreamName)) {
          // Show loading state while waiting for debounced validation
          dispatchValidation({ type: 'SET_IS_VALIDATING', payload: true });
          // Abort any in-flight validation and cancel pending debounced validation before scheduling a new one
          abortDebouncedValidation();
          cancelDebouncedValidationRef.current();
          runDebouncedValidationDebouncedRef.current(newStreamName);
        }
      }
    },
    [hasAttemptedSubmit, validationError, abortCreateValidation, abortDebouncedValidation]
  );

  const handleCreate = useCallback(async () => {
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    cancelDebouncedValidationRef.current();
    abortDebouncedValidation();

    const abortController = getCreateAbortController();

    dispatchValidation({ type: 'SET_HAS_ATTEMPTED_SUBMIT', payload: true });
    dispatchValidation({ type: 'SET_IS_VALIDATING', payload: true });

    try {
      const result = await validateStreamName(
        streamName,
        onValidateRef.current,
        abortController.signal
      );

      dispatchValidation({ type: 'SET_VALIDATION_ERROR', payload: result.errorType });
      dispatchValidation({
        type: 'SET_CONFLICTING_INDEX_PATTERN',
        payload: result.conflictingIndexPattern,
      });

      if (result.errorType === null) {
        onCreate(streamName);
      }
    } catch (error) {
      // Suppress expected aborts; only log unexpected errors
      if (!abortController.signal.aborted) {
        // eslint-disable-next-line no-console
        console.error('Validation error:', error);
      }
    } finally {
      dispatchValidation({ type: 'SET_IS_VALIDATING', payload: false });
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [abortDebouncedValidation, getCreateAbortController, onCreate, streamName, onValidateRef]);

  const resetOnTemplateChange = useCallback(() => {
    resetValidationState();
  }, [resetValidationState]);

  const resetOnIndexPatternChange = useCallback(() => {
    resetValidationState();
  }, [resetValidationState]);

  useEffect(() => {
    return () => {
      abortCreateValidation();
      abortDebouncedValidation();
    };
  }, [abortCreateValidation, abortDebouncedValidation]);

  return {
    validationError,
    conflictingIndexPattern,
    hasAttemptedSubmit,
    isValidating,
    isSubmitting,
    handleStreamNameChange,
    handleCreate,
    resetOnTemplateChange,
    resetOnIndexPatternChange,
  };
};
