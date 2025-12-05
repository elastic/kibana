/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useMemo } from 'react';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import type { ValidationErrorType } from '../utils';

export enum ClassicStreamStep {
  SELECT_TEMPLATE = 'select_template',
  NAME_AND_CONFIRM = 'name_and_confirm',
}

export interface ClassicStreamState {
  currentStep: ClassicStreamStep;
  selectedTemplate: TemplateDeserialized | null;
  streamName: string;
  selectedIndexPattern: string;
  validationError: ValidationErrorType;
  conflictingIndexPattern: string | undefined;
  hasAttemptedSubmit: boolean;
  isValidating: boolean;
}

// Action types
type Action =
  | { type: 'SELECT_TEMPLATE'; payload: TemplateDeserialized | null }
  | { type: 'CHANGE_INDEX_PATTERN'; payload: string }
  | { type: 'CHANGE_STREAM_NAME'; payload: string }
  | { type: 'GO_TO_NEXT_STEP' }
  | { type: 'GO_TO_PREVIOUS_STEP' }
  | { type: 'START_VALIDATION' }
  | {
      type: 'VALIDATION_COMPLETE';
      payload: {
        errorType: ValidationErrorType;
        conflictingIndexPattern?: string;
      };
    }
  | { type: 'SUBMIT_START' }
  | { type: 'RESET_SUBMIT_MODE' };

const initialState: ClassicStreamState = {
  currentStep: ClassicStreamStep.SELECT_TEMPLATE,
  selectedTemplate: null,
  streamName: '',
  selectedIndexPattern: '',
  validationError: null,
  conflictingIndexPattern: undefined,
  hasAttemptedSubmit: false,
  isValidating: false,
};

function classicStreamReducer(state: ClassicStreamState, action: Action): ClassicStreamState {
  switch (action.type) {
    case 'SELECT_TEMPLATE':
      // Reset stream-related state when selecting a different template
      return {
        ...state,
        selectedTemplate: action.payload,
        streamName: '',
        selectedIndexPattern: '',
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
      };

    case 'CHANGE_INDEX_PATTERN':
      // Reset validation when changing index patterns within a template
      return {
        ...state,
        selectedIndexPattern: action.payload,
        validationError: null,
        conflictingIndexPattern: undefined,
        hasAttemptedSubmit: false,
      };

    case 'CHANGE_STREAM_NAME':
      return {
        ...state,
        streamName: action.payload,
      };

    case 'GO_TO_NEXT_STEP':
      return {
        ...state,
        currentStep: ClassicStreamStep.NAME_AND_CONFIRM,
      };

    case 'GO_TO_PREVIOUS_STEP':
      return {
        ...state,
        currentStep: ClassicStreamStep.SELECT_TEMPLATE,
      };

    case 'START_VALIDATION':
      return {
        ...state,
        isValidating: true,
      };

    case 'VALIDATION_COMPLETE':
      return {
        ...state,
        isValidating: false,
        validationError: action.payload.errorType,
        conflictingIndexPattern: action.payload.conflictingIndexPattern,
        // Reset submit mode if validation passed
        hasAttemptedSubmit: action.payload.errorType !== null ? state.hasAttemptedSubmit : false,
      };

    case 'SUBMIT_START':
      return {
        ...state,
        hasAttemptedSubmit: true,
      };

    case 'RESET_SUBMIT_MODE':
      return {
        ...state,
        hasAttemptedSubmit: false,
      };

    default:
      return state;
  }
}

export function useClassicStreamState() {
  const [state, dispatch] = useReducer(classicStreamReducer, initialState);

  const actions = useMemo(
    () => ({
      selectTemplate: (template: TemplateDeserialized | null) =>
        dispatch({ type: 'SELECT_TEMPLATE', payload: template }),

      changeIndexPattern: (pattern: string) =>
        dispatch({ type: 'CHANGE_INDEX_PATTERN', payload: pattern }),

      changeStreamName: (name: string) => dispatch({ type: 'CHANGE_STREAM_NAME', payload: name }),

      goToNextStep: () => dispatch({ type: 'GO_TO_NEXT_STEP' }),

      goToPreviousStep: () => dispatch({ type: 'GO_TO_PREVIOUS_STEP' }),

      startValidation: () => dispatch({ type: 'START_VALIDATION' }),

      completeValidation: (errorType: ValidationErrorType, conflictingIndexPattern?: string) =>
        dispatch({
          type: 'VALIDATION_COMPLETE',
          payload: { errorType, conflictingIndexPattern },
        }),

      startSubmit: () => dispatch({ type: 'SUBMIT_START' }),

      resetSubmitMode: () => dispatch({ type: 'RESET_SUBMIT_MODE' }),
    }),
    []
  );

  const derivedState = useMemo(() => {
    const isFirstStep = state.currentStep === ClassicStreamStep.SELECT_TEMPLATE;
    return {
      isFirstStep,
      hasNextStep: isFirstStep,
      hasPreviousStep: !isFirstStep,
      isNextButtonEnabled: state.selectedTemplate !== null,
    };
  }, [state.currentStep, state.selectedTemplate]);

  return {
    state,
    actions,
    ...derivedState,
  };
}
