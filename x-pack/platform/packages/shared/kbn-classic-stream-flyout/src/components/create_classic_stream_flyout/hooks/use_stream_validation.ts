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
  const { streamName, validationMode } = formState;

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
          // Real error (not abort) - clear validation state
          dispatch({ type: 'ABORT_VALIDATION' });
        }
        // If aborted, don't dispatch anything - let the new validation manage state
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

      // Debounced validation flow - triggered in LIVE mode
      const controller = getDebouncedAbortController();
      await runValidation(name, controller, isDebouncedAborted);

      // If validation succeeds, we'll transition back to IDLE via COMPLETE_VALIDATION
      // (no special handling needed here)
    },
    debounceMs
  );

  // Input change handler - state machine logic
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

      // State machine: determine if we should validate based on current mode
      if (!hasNameChanged) {
        return;
      }

      switch (validationMode) {
        case 'idle':
          // IDLE mode: don't validate on typing
          break;

        case 'submitting':
          // SUBMITTING mode: user typed during Create validation
          // Abort Create and return to IDLE (stop loader, no validation)
          abortCreate();
          dispatch({ type: 'ABORT_VALIDATION' });
          break;

        case 'live':
          // LIVE mode: validate on every keystroke (with debounce)
          abortDebounced();
          cancelDebounced();
          dispatch({ type: 'START_DEBOUNCED_VALIDATION' });
          triggerDebouncedValidation(newStreamName);
          break;
      }
    },
    [
      dispatch,
      validationMode,
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
