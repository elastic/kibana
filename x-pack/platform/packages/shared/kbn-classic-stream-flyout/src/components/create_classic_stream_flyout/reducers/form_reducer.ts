/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Form state - user inputs (separate concern from validation)
export interface FormState {
  selectedTemplate: string | null;
  streamName: string;
  selectedIndexPattern: string;
}

export type FormAction =
  | { type: 'SET_SELECTED_TEMPLATE'; payload: string | null }
  | { type: 'SET_STREAM_NAME'; payload: string }
  | { type: 'SET_SELECTED_INDEX_PATTERN'; payload: string }
  | { type: 'RESET_FORM' }
  | { type: 'RESET_ON_TEMPLATE_CHANGE' };

export const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_SELECTED_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'SET_STREAM_NAME':
      return { ...state, streamName: action.payload };
    case 'SET_SELECTED_INDEX_PATTERN':
      return { ...state, selectedIndexPattern: action.payload };
    case 'RESET_FORM':
      return {
        selectedTemplate: null,
        streamName: '',
        selectedIndexPattern: '',
      };
    case 'RESET_ON_TEMPLATE_CHANGE':
      return {
        ...state,
        streamName: '',
        selectedIndexPattern: '',
      };
    default:
      return state;
  }
};

export const initialFormState: FormState = {
  selectedTemplate: null,
  streamName: '',
  selectedIndexPattern: '',
};
