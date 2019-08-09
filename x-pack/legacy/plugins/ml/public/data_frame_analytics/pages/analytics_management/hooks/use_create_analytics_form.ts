/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';

import { isValidIndexName } from '../../../../../common/util/es_utils';

import { isAnalyticsIdValid, DataFrameAnalyticsId } from '../../../common';

export type EsIndexName = string;
export type IndexPatternTitle = string;

export interface State {
  createIndexPattern: boolean;
  destinationIndex: EsIndexName;
  destinationIndexNameExists: boolean;
  destinationIndexNameEmpty: boolean;
  destinationIndexNameValid: boolean;
  destinationIndexPatternTitleExists: boolean;
  indexNames: EsIndexName[];
  indexPatternTitles: IndexPatternTitle[];
  indexPatternsWithNumericFields: IndexPatternTitle[];
  isJobCreated: boolean;
  isJobStarted: boolean;
  isModalButtonDisabled: boolean;
  isModalVisible: boolean;
  isValid: boolean;
  jobId: DataFrameAnalyticsId;
  jobIds: DataFrameAnalyticsId[];
  jobIdExists: boolean;
  jobIdEmpty: boolean;
  jobIdValid: boolean;
  sourceIndex: EsIndexName;
  sourceIndexNameExists: boolean;
  sourceIndexNameEmpty: boolean;
  sourceIndexNameValid: boolean;
}

export const getInitialState = (): State => ({
  createIndexPattern: false,
  destinationIndex: '',
  destinationIndexNameExists: false,
  destinationIndexNameEmpty: true,
  destinationIndexNameValid: false,
  destinationIndexPatternTitleExists: false,
  indexNames: [],
  indexPatternTitles: [],
  indexPatternsWithNumericFields: [],
  isJobCreated: false,
  isJobStarted: false,
  isModalVisible: false,
  isModalButtonDisabled: false,
  isValid: false,
  jobId: '',
  jobIds: [],
  jobIdExists: false,
  jobIdEmpty: true,
  jobIdValid: false,
  sourceIndex: '',
  sourceIndexNameExists: false,
  sourceIndexNameEmpty: true,
  sourceIndexNameValid: false,
});

const validate = (state: State): State => {
  state.isValid =
    !state.jobIdEmpty &&
    state.jobIdValid &&
    !state.jobIdExists &&
    !state.sourceIndexNameEmpty &&
    state.sourceIndexNameValid &&
    !state.destinationIndexNameEmpty &&
    state.destinationIndexNameValid &&
    (!state.destinationIndexPatternTitleExists || !state.createIndexPattern);

  return state;
};

enum ACTION {
  RESET = 'reset',
  SET_FORM_STATE = 'set_form_state',
}

type Action = { type: ACTION.RESET } | { type: ACTION.SET_FORM_STATE; payload: Partial<State> };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ACTION.RESET:
      return getInitialState();

    case ACTION.SET_FORM_STATE:
      const newState = { ...state, ...action.payload };

      // update state attributes which are derived from other state attributes.
      if (action.payload.destinationIndex !== undefined) {
        newState.destinationIndexNameExists = newState.indexNames.some(
          name => state.destinationIndex === name
        );
        newState.destinationIndexNameEmpty = newState.destinationIndex === '';
        newState.destinationIndexNameValid = isValidIndexName(newState.destinationIndex);
        newState.destinationIndexPatternTitleExists = newState.indexPatternTitles.some(
          name => newState.destinationIndex === name
        );
      }

      if (action.payload.indexNames !== undefined) {
        newState.destinationIndexNameExists = newState.indexNames.some(
          name => newState.destinationIndex === name
        );
        newState.sourceIndexNameExists = newState.indexNames.some(
          name => newState.sourceIndex === name
        );
      }

      if (action.payload.indexPatternTitles !== undefined) {
        newState.destinationIndexPatternTitleExists = newState.indexPatternTitles.some(
          name => newState.destinationIndex === name
        );
      }

      if (action.payload.jobId !== undefined) {
        newState.jobIdExists = newState.jobIds.some(id => newState.jobId === id);
        newState.jobIdEmpty = newState.jobId === '';
        newState.jobIdValid = isAnalyticsIdValid(newState.jobId);
      }

      if (action.payload.jobIds !== undefined) {
        newState.jobIdExists = newState.jobIds.some(id => state.jobId === id);
      }

      if (action.payload.sourceIndex !== undefined) {
        newState.sourceIndexNameExists = state.indexNames.some(
          name => newState.sourceIndex === name
        );
        newState.sourceIndexNameEmpty = newState.sourceIndex === '';
        newState.sourceIndexNameValid = isValidIndexName(newState.sourceIndex);
      }

      return validate(newState);
  }

  return state;
}

export const useCreateAnalyticsForm = () => {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  return {
    state,
    actions: {
      reset: () => dispatch({ type: ACTION.RESET }),
      setFormState: (payload: Partial<State>) => {
        dispatch({ type: ACTION.SET_FORM_STATE, payload });
      },
    },
  };
};
