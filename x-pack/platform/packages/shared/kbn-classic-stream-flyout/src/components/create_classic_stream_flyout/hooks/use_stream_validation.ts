/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, type Dispatch } from 'react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';

import { validateStreamName, type StreamNameValidator } from '../../../utils';
import { useAbortController } from './use_abort_controller';
import { useDebouncedCallback } from './use_debounced_callback';
import type { FormAction, FormState } from '../reducers/form_reducer';

const DEFAULT_VALIDATION_DEBOUNCE_MS = 300;

interface UseStreamValidationParams {
  formState: FormState;
  dispatch: Dispatch<FormAction>;
  onCreate: (streamName: string) => Promise<void>;
  selectedTemplate: IndexTemplate | undefined;
  onValidate?: StreamNameValidator;
  debounceMs?: number;
}

interface UseStreamValidationReturn {
  handleStreamNameChange: (streamName: string) => void;
  handleCreate: () => Promise<void>;
  resetValidation: () => void;
  setStreamName: (streamName: string) => void;
}

export const useStreamValidation = ({
  formState,
  dispatch,
  onCreate,
  selectedTemplate,
  onValidate,
  debounceMs = DEFAULT_VALIDATION_DEBOUNCE_MS,
}: UseStreamValidationParams): UseStreamValidationReturn => {
  const { streamName, validation } = formState;

  const {
    getAbortController: getCreateValidationAbortController,
    isAborted: isCreateValidationAborted,
    abort: abortCreateValidation,
  } = useAbortController();
  const {
    getAbortController: getDebouncedValidationAbortController,
    isAborted: isDebouncedValidationAborted,
    abort: abortDebouncedValidation,
  } = useAbortController();

  const runValidation = useCallback(
    async (
      name: string,
      abortController: AbortController,
      isAbortedFn: (controller: AbortController) => boolean
    ): Promise<boolean> => {
      // Cannot validate without a selected template
      if (!selectedTemplate) {
        return false;
      }

      try {
        const result = await validateStreamName(
          name,
          selectedTemplate,
          onValidate,
          abortController.signal
        );

        // Race condition: abort might have been called while validation was in progress.
        // Don't update state if aborted - the component may have started a new validation.
        if (isAbortedFn(abortController)) {
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
        // Network/validation error occurred. Only dispatch if NOT aborted
        if (!isAbortedFn(abortController)) {
          dispatch({ type: 'ABORT_VALIDATION' });
        }
        // if aborted, the newer validation should handle state, not this stale one.
        return false;
      }
    },
    [dispatch, selectedTemplate, onValidate]
  );

  // Debounce validation calls to avoid excessive requests while user is typing
  const { trigger: triggerDebouncedValidation, cancel: cancelDebouncedValidationTimer } =
    useDebouncedCallback(async (name: string) => {
      // Ensure we validate the current stream name, not a stale one
      if (name !== formState.streamName) {
        return;
      }

      const controller = getDebouncedValidationAbortController();
      await runValidation(name, controller, isDebouncedValidationAborted);
    }, debounceMs);

  const handleStreamNameChange = useCallback(
    (newStreamName: string) => {
      // Skip if name hasn't changed from current prop
      if (newStreamName === streamName) {
        return;
      }

      dispatch({ type: 'SET_STREAM_NAME', payload: newStreamName });

      switch (validation.mode) {
        case 'idle':
          // IDLE mode: don't validate on typing
          break;

        case 'create':
          // CREATE mode: user typed during Create validation
          // Abort Create and return to IDLE (stop loader, no validation)
          abortCreateValidation();
          dispatch({ type: 'ABORT_VALIDATION' });
          break;

        case 'live':
          // LIVE mode: validate on every keystroke (with debounce)
          abortDebouncedValidation();
          cancelDebouncedValidationTimer();
          dispatch({ type: 'START_DEBOUNCED_VALIDATION' });
          triggerDebouncedValidation(newStreamName);
          break;
      }
    },
    [
      dispatch,
      validation.mode,
      streamName,
      abortCreateValidation,
      abortDebouncedValidation,
      cancelDebouncedValidationTimer,
      triggerDebouncedValidation,
    ]
  );

  const setStreamName = useCallback(
    (newStreamName: string) => {
      dispatch({ type: 'SET_STREAM_NAME', payload: newStreamName });
    },
    [dispatch]
  );

  // Create handler - immediate validation triggered by create button
  const handleCreate = useCallback(async () => {
    cancelDebouncedValidationTimer();
    abortDebouncedValidation();

    dispatch({ type: 'START_CREATE_VALIDATION' });
    const controller = getCreateValidationAbortController();
    const isValid = await runValidation(streamName, controller, isCreateValidationAborted);

    if (isValid && !isCreateValidationAborted(controller)) {
      dispatch({ type: 'START_SUBMITTING' });
      // Swallow errors from onCreate - errors are handled by the callback itself
      await onCreate(streamName)
        .catch(() => {})
        .finally(() => {
          dispatch({ type: 'STOP_SUBMITTING' });
        });
    }
  }, [
    cancelDebouncedValidationTimer,
    abortDebouncedValidation,
    dispatch,
    getCreateValidationAbortController,
    runValidation,
    isCreateValidationAborted,
    streamName,
    onCreate,
  ]);

  const resetValidation = useCallback(() => {
    abortCreateValidation();
    abortDebouncedValidation();
    cancelDebouncedValidationTimer();
  }, [abortCreateValidation, abortDebouncedValidation, cancelDebouncedValidationTimer]);

  return {
    handleStreamNameChange,
    handleCreate,
    resetValidation,
    setStreamName,
  };
};
