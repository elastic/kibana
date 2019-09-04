/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { i18n } from '@kbn/i18n';

import { validateIndexPattern } from 'ui/index_patterns';

import { isValidIndexName } from '../../../../../../common/util/es_utils';

import { isAnalyticsIdValid } from '../../../../common';

import { Action, ACTION } from './actions';
import { getInitialState, getJobConfigFromFormState, State } from './state';

const getSourceIndexString = (state: State) => {
  const { jobConfig } = state;

  const sourceIndex = idx(jobConfig, _ => _.source.index);

  if (typeof sourceIndex === 'string') {
    return sourceIndex;
  }

  if (Array.isArray(sourceIndex)) {
    return sourceIndex.join(',');
  }

  return '';
};

export const validateAdvancedEditor = (state: State): State => {
  const { jobIdEmpty, jobIdValid, jobIdExists, createIndexPattern } = state.form;
  const { jobConfig } = state;

  state.advancedEditorMessages = [];

  const sourceIndexName = getSourceIndexString(state);
  const sourceIndexNameEmpty = sourceIndexName === '';
  // general check against Kibana index pattern names, but since this is about the advanced editor
  // with support for arrays in the job config, we also need to check that each individual name
  // doesn't include a comma if index names are supplied as an array.
  // `validateIndexPattern()` returns a map of messages, we're only interested here if it's valid or not.
  // If there are no messages, it means the index pattern is valid.
  let sourceIndexNameValid = Object.keys(validateIndexPattern(sourceIndexName)).length === 0;
  const sourceIndex = idx(jobConfig, _ => _.source.index);
  if (sourceIndexNameValid) {
    if (typeof sourceIndex === 'string') {
      sourceIndexNameValid = !sourceIndex.includes(',');
    }
    if (Array.isArray(sourceIndex)) {
      sourceIndexNameValid = !sourceIndex.some(d => d.includes(','));
    }
  }

  const destinationIndexName = idx(jobConfig, _ => _.dest.index) || '';
  const destinationIndexNameEmpty = destinationIndexName === '';
  const destinationIndexNameValid = isValidIndexName(destinationIndexName);
  const destinationIndexPatternTitleExists = state.indexPatternTitles.some(
    name => destinationIndexName === name
  );

  if (sourceIndexNameEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.sourceIndexNameEmpty',
        {
          defaultMessage: 'The source index name must not be empty.',
        }
      ),
      message: '',
    });
  } else if (!sourceIndexNameValid) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.sourceIndexNameValid',
        {
          defaultMessage: 'Invalid source index name.',
        }
      ),
      message: '',
    });
  }

  if (destinationIndexNameEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.destinationIndexNameEmpty',
        {
          defaultMessage: 'The destination index name must not be empty.',
        }
      ),
      message: '',
    });
  } else if (!destinationIndexNameValid) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.destinationIndexNameValid',
        {
          defaultMessage: 'Invalid destination index name.',
        }
      ),
      message: '',
    });
  }

  state.isValid =
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    (!destinationIndexPatternTitleExists || !createIndexPattern);

  return state;
};

const validateForm = (state: State): State => {
  const {
    jobIdEmpty,
    jobIdValid,
    jobIdExists,
    sourceIndexNameEmpty,
    sourceIndexNameValid,
    destinationIndexNameEmpty,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    createIndexPattern,
  } = state.form;

  state.isValid =
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    (!destinationIndexPatternTitleExists || !createIndexPattern);

  return state;
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ACTION.ADD_REQUEST_MESSAGE:
      const requestMessages = state.requestMessages;
      requestMessages.push(action.requestMessage);
      return { ...state, requestMessages };

    case ACTION.RESET_REQUEST_MESSAGES:
      return { ...state, requestMessages: [] };

    case ACTION.CLOSE_MODAL:
      return { ...state, isModalVisible: false };

    case ACTION.OPEN_MODAL:
      return { ...state, isModalVisible: true };

    case ACTION.RESET_ADVANCED_EDITOR_MESSAGES:
      return { ...state, advancedEditorMessages: [] };

    case ACTION.RESET_FORM:
      return getInitialState();

    case ACTION.SET_ADVANCED_EDITOR_RAW_STRING:
      return { ...state, advancedEditorRawString: action.advancedEditorRawString };

    case ACTION.SET_FORM_STATE:
      const newFormState = { ...state.form, ...action.payload };

      // update state attributes which are derived from other state attributes.
      if (action.payload.destinationIndex !== undefined) {
        newFormState.destinationIndexNameExists = state.indexNames.some(
          name => newFormState.destinationIndex === name
        );
        newFormState.destinationIndexNameEmpty = newFormState.destinationIndex === '';
        newFormState.destinationIndexNameValid = isValidIndexName(newFormState.destinationIndex);
        newFormState.destinationIndexPatternTitleExists = state.indexPatternTitles.some(
          name => newFormState.destinationIndex === name
        );
      }

      if (action.payload.jobId !== undefined) {
        newFormState.jobIdExists = state.jobIds.some(id => newFormState.jobId === id);
        newFormState.jobIdEmpty = newFormState.jobId === '';
        newFormState.jobIdValid = isAnalyticsIdValid(newFormState.jobId);
      }

      if (action.payload.sourceIndex !== undefined) {
        newFormState.sourceIndexNameEmpty = newFormState.sourceIndex === '';
        const validationMessages = validateIndexPattern(newFormState.sourceIndex);
        newFormState.sourceIndexNameValid = Object.keys(validationMessages).length === 0;
      }

      return state.isAdvancedEditorEnabled
        ? validateAdvancedEditor({ ...state, form: newFormState })
        : validateForm({ ...state, form: newFormState });

    case ACTION.SET_INDEX_NAMES: {
      const newState = { ...state, indexNames: action.indexNames };
      newState.form.destinationIndexNameExists = newState.indexNames.some(
        name => newState.form.destinationIndex === name
      );
      return newState;
    }

    case ACTION.SET_INDEX_PATTERN_TITLES: {
      const newState = {
        ...state,
        ...action.payload,
      };
      newState.form.destinationIndexPatternTitleExists = newState.indexPatternTitles.some(
        name => newState.form.destinationIndex === name
      );
      return newState;
    }

    case ACTION.SET_IS_JOB_CREATED:
      return { ...state, isJobCreated: action.isJobCreated };

    case ACTION.SET_IS_JOB_STARTED:
      return { ...state, isJobStarted: action.isJobStarted };

    case ACTION.SET_IS_MODAL_BUTTON_DISABLED:
      return { ...state, isModalButtonDisabled: action.isModalButtonDisabled };

    case ACTION.SET_IS_MODAL_VISIBLE:
      return { ...state, isModalVisible: action.isModalVisible };

    case ACTION.SET_JOB_CONFIG:
      return validateAdvancedEditor({ ...state, jobConfig: action.payload });

    case ACTION.SET_JOB_IDS: {
      const newState = { ...state, jobIds: action.jobIds };
      newState.form.jobIdExists = newState.jobIds.some(id => newState.form.jobId === id);
      return newState;
    }

    case ACTION.SWITCH_TO_ADVANCED_EDITOR:
      const jobConfig = getJobConfigFromFormState(state.form);
      return validateAdvancedEditor({
        ...state,
        advancedEditorRawString: JSON.stringify(jobConfig, null, 2),
        isAdvancedEditorEnabled: true,
        jobConfig,
      });
  }

  return state;
}
