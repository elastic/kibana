/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, type Dispatch } from 'react';
import { validateStreamName, type StreamNameValidator } from '../../../utils';
import { useAbortController } from './use_abort_controller';
import { useDebouncedCallback } from './use_debounced_callback';
import type { FormAction, FormState } from '../reducers/form_reducer';

const DEFAULT_VALIDATION_DEBOUNCE_MS = 300;

interface UseStreamValidationParams {
  formState: FormState;
  dispatch: Dispatch<FormAction>;
  onCreate: (streamName: string) => void;
  onValidate?: StreamNameValidator;
  debounceMs?: number;
}

interface UseStreamValidationReturn {
  handleStreamNameChange: (streamName: string) => void;
  handleCreate: () => Promise<void>;
  resetValidation: () => void;
}

export const useStreamValidation = ({
  formState,
  dispatch,
  onCreate,
  onValidate,
  debounceMs = DEFAULT_VALIDATION_DEBOUNCE_MS,
}: UseStreamValidationParams): UseStreamValidationReturn => {
  const { streamName, isSubmitting, hasAttemptedSubmit, validationError } = formState;

  const lastStreamNameRef = useRef<string>(streamName); // Initialize from state
  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;

  const {
    getAbortController: getCreateAbortController,
    isAborted: isCreateAborted,
    abort: abortCreate,
  } = useAbortController();
  const {
    getAbortController: getDebouncedAbortController,
    isAborted: isDebouncedAborted,
    abort: abortDebounced,
  } = useAbortController();

  // Core validation runner - handles the actual validation API call and state updates
  const runValidation = useCallback(
    async (
      name: string,
      abortController: AbortController,
      isAbortedFn: (controller: AbortController) => boolean
    ): Promise<boolean> => {
      try {
        const result = await validateStreamName(
          name,
          onValidateRef.current,
          abortController.signal
        );

        if (isAbortedFn(abortController)) {
          // Aborted - don't dispatch anything, caller will handle state
          return false;
        }

        dispatch({
          type: 'COMPLETE_VALIDATION',
          payload: {
            errorType: result.errorType,
            conflictingIndexPattern: result.conflictingIndexPattern,
          },
        });

        return result.errorType === null;
      } catch (error) {
        if (!isAbortedFn(abortController)) {
          // eslint-disable-next-line no-console
          console.error('Validation error:', error);
        }
        dispatch({ type: 'ABORT_VALIDATION' });
        return false;
      }
    },
    [dispatch]
  );

  // Debounced validation flow - only triggered in Live Validation Mode (when there's an active error)
  const { trigger: triggerDebouncedValidation, cancel: cancelDebounced } = useDebouncedCallback(
    async (name: string) => {
      // Skip if name changed since this was scheduled
      if (lastStreamNameRef.current !== name) {
        return;
      }

      const controller = getDebouncedAbortController();
      const isValid = await runValidation(name, controller, isDebouncedAborted);

      // Reset validation state if user fixed the error
      if (isValid && hasAttemptedSubmit) {
        dispatch({ type: 'RESET_VALIDATION' });
      }
    },
    debounceMs
  );

  // Input change handler - implements two-mode (live vs idle) behavior
  const handleStreamNameChange = useCallback(
    (newStreamName: string) => {
      // Skip if name hasn't changed
      if (newStreamName === lastStreamNameRef.current) {
        return;
      }

      const hasNameChanged =
        lastStreamNameRef.current !== '' && newStreamName !== lastStreamNameRef.current;
      lastStreamNameRef.current = newStreamName;

      // Update form state
      dispatch({ type: 'SET_STREAM_NAME', payload: newStreamName });

      // If user types during Create validation, abort and return to Idle Mode
      if (isSubmitting && hasNameChanged) {
        abortCreate();
        dispatch({ type: 'ABORT_VALIDATION' });
        // Don't start new validation - return to Idle Mode unless there's an error (handled below)
      }

      // Live Validation Mode: auto-validate when there's an active error to help user recover
      const isInLiveValidationMode = hasAttemptedSubmit && validationError !== null;
      if (isInLiveValidationMode && hasNameChanged) {
        // Don't clear error - keep it visible while validating, it will be replaced when validation completes
        abortDebounced();
        cancelDebounced();
        // Set isValidating immediately to show loading state
        dispatch({ type: 'START_DEBOUNCED_VALIDATION' });
        triggerDebouncedValidation(newStreamName);
      }
    },
    [
      dispatch,
      isSubmitting,
      hasAttemptedSubmit,
      validationError,
      abortCreate,
      abortDebounced,
      cancelDebounced,
      triggerDebouncedValidation,
    ]
  );

  // Create handler - immediate validation triggered by create button
  const handleCreate = useCallback(async () => {
    cancelDebounced();
    abortDebounced();

    dispatch({ type: 'START_CREATE_VALIDATION' });
    const controller = getCreateAbortController();
    const isValid = await runValidation(streamName, controller, isCreateAborted);

    // Only call onCreate if validation succeeded AND wasn't aborted
    if (isValid && !isCreateAborted(controller)) {
      onCreate(streamName);
    }
  }, [
    cancelDebounced,
    abortDebounced,
    dispatch,
    getCreateAbortController,
    runValidation,
    isCreateAborted,
    streamName,
    onCreate,
  ]);

  const resetValidation = useCallback(() => {
    abortCreate();
    abortDebounced();
    cancelDebounced();
  }, [abortCreate, abortDebounced, cancelDebounced]);

  return {
    handleStreamNameChange,
    handleCreate,
    resetValidation,
  };
};
