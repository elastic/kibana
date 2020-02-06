/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isValidIndexName } from '../../../../../../../common/util/es_utils';

import { Action, ACTION } from './actions';
import { getInitialState, getJobConfigFromFormState, State, JOB_TYPES } from './state';
import {
  isJobIdValid,
  validateModelMemoryLimitUnits,
} from '../../../../../../../common/util/job_utils';
import { maxLengthValidator } from '../../../../../../../common/util/validators';
import {
  JOB_ID_MAX_LENGTH,
  ALLOWED_DATA_UNITS,
} from '../../../../../../../common/constants/validation';
import {
  getDependentVar,
  isRegressionAnalysis,
  isClassificationAnalysis,
} from '../../../../common/analytics';
import { indexPatterns } from '../../../../../../../../../../../src/plugins/data/public';

const mmlAllowedUnitsStr = `${ALLOWED_DATA_UNITS.slice(0, ALLOWED_DATA_UNITS.length - 1).join(
  ', '
)} or ${[...ALLOWED_DATA_UNITS].pop()}`;

export const mmlUnitInvalidErrorMessage = i18n.translate(
  'xpack.ml.dataframe.analytics.create.modelMemoryUnitsInvalidError',
  {
    defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
    values: { str: mmlAllowedUnitsStr },
  }
);

const getSourceIndexString = (state: State) => {
  const { jobConfig } = state;

  const sourceIndex = jobConfig?.source?.index;

  if (typeof sourceIndex === 'string') {
    return sourceIndex;
  }

  if (Array.isArray(sourceIndex)) {
    return sourceIndex.join(',');
  }

  return '';
};

export const validateAdvancedEditor = (state: State): State => {
  const {
    jobIdEmpty,
    jobIdValid,
    jobIdExists,
    jobType,
    createIndexPattern,
    excludes,
    maxDistinctValuesError,
  } = state.form;
  const { jobConfig } = state;

  state.advancedEditorMessages = [];

  const sourceIndexName = getSourceIndexString(state);
  const sourceIndexNameEmpty = sourceIndexName === '';
  // general check against Kibana index pattern names, but since this is about the advanced editor
  // with support for arrays in the job config, we also need to check that each individual name
  // doesn't include a comma if index names are supplied as an array.
  // `indexPatterns.validate()` returns a map of messages, we're only interested here if it's valid or not.
  // If there are no messages, it means the index pattern is valid.
  let sourceIndexNameValid = Object.keys(indexPatterns.validate(sourceIndexName)).length === 0;
  const sourceIndex = jobConfig?.source?.index;
  if (sourceIndexNameValid) {
    if (typeof sourceIndex === 'string') {
      sourceIndexNameValid = !sourceIndex.includes(',');
    }
    if (Array.isArray(sourceIndex)) {
      sourceIndexNameValid = !sourceIndex.some(d => d?.includes(','));
    }
  }

  const destinationIndexName = jobConfig?.dest?.index ?? '';
  const destinationIndexNameEmpty = destinationIndexName === '';
  const destinationIndexNameValid = isValidIndexName(destinationIndexName);
  const destinationIndexPatternTitleExists =
    state.indexPatternsMap[destinationIndexName] !== undefined;
  const mml = jobConfig.model_memory_limit;
  const modelMemoryLimitEmpty = mml === '' || mml === undefined;
  if (!modelMemoryLimitEmpty && mml !== undefined) {
    const { valid } = validateModelMemoryLimitUnits(mml);
    state.form.modelMemoryLimitUnitValid = valid;
  }

  let dependentVariableEmpty = false;
  let excludesValid = true;

  if (
    jobConfig.analysis === undefined &&
    (jobType === JOB_TYPES.CLASSIFICATION || jobType === JOB_TYPES.REGRESSION)
  ) {
    dependentVariableEmpty = true;
  }

  if (
    jobConfig.analysis !== undefined &&
    (isRegressionAnalysis(jobConfig.analysis) || isClassificationAnalysis(jobConfig.analysis))
  ) {
    const dependentVariableName = getDependentVar(jobConfig.analysis) || '';
    dependentVariableEmpty = dependentVariableName === '';

    if (!dependentVariableEmpty && excludes.includes(dependentVariableName)) {
      excludesValid = false;

      state.advancedEditorMessages.push({
        error: i18n.translate(
          'xpack.ml.dataframe.analytics.create.advancedEditorMessage.excludesInvalid',
          {
            defaultMessage: 'The dependent variable cannot be excluded.',
          }
        ),
        message: '',
      });
    }
  }

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

  if (dependentVariableEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.dependentVariableEmpty',
        {
          defaultMessage: 'The dependent variable field must not be empty.',
        }
      ),
      message: '',
    });
  }

  if (modelMemoryLimitEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.modelMemoryLimitEmpty',
        {
          defaultMessage: 'The model memory limit field must not be empty.',
        }
      ),
      message: '',
    });
  }

  if (!state.form.modelMemoryLimitUnitValid) {
    state.advancedEditorMessages.push({
      error: mmlUnitInvalidErrorMessage,
      message: '',
    });
  }

  state.isValid =
    maxDistinctValuesError === undefined &&
    excludesValid &&
    state.form.modelMemoryLimitUnitValid &&
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    !dependentVariableEmpty &&
    !modelMemoryLimitEmpty &&
    (!destinationIndexPatternTitleExists || !createIndexPattern);

  return state;
};

const validateForm = (state: State): State => {
  const {
    jobIdEmpty,
    jobIdValid,
    jobIdExists,
    jobType,
    sourceIndexNameEmpty,
    sourceIndexNameValid,
    destinationIndexNameEmpty,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    createIndexPattern,
    dependentVariable,
    maxDistinctValuesError,
    modelMemoryLimit,
  } = state.form;

  const jobTypeEmpty = jobType === undefined;
  const dependentVariableEmpty =
    (jobType === JOB_TYPES.REGRESSION || jobType === JOB_TYPES.CLASSIFICATION) &&
    dependentVariable === '';
  const modelMemoryLimitEmpty = modelMemoryLimit === '';

  if (!modelMemoryLimitEmpty && modelMemoryLimit !== undefined) {
    const { valid } = validateModelMemoryLimitUnits(modelMemoryLimit);
    state.form.modelMemoryLimitUnitValid = valid;
  }

  state.isValid =
    maxDistinctValuesError === undefined &&
    !jobTypeEmpty &&
    state.form.modelMemoryLimitUnitValid &&
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    !dependentVariableEmpty &&
    !modelMemoryLimitEmpty &&
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
        newFormState.destinationIndexPatternTitleExists =
          state.indexPatternsMap[newFormState.destinationIndex] !== undefined;
      }

      if (action.payload.jobId !== undefined) {
        newFormState.jobIdExists = state.jobIds.some(id => newFormState.jobId === id);
        newFormState.jobIdEmpty = newFormState.jobId === '';
        newFormState.jobIdValid = isJobIdValid(newFormState.jobId);
        newFormState.jobIdInvalidMaxLength = !!maxLengthValidator(JOB_ID_MAX_LENGTH)(
          newFormState.jobId
        );
      }

      if (action.payload.sourceIndex !== undefined) {
        newFormState.sourceIndexNameEmpty = newFormState.sourceIndex === '';
        const validationMessages = indexPatterns.validate(newFormState.sourceIndex);
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
      newState.form.destinationIndexPatternTitleExists =
        newState.indexPatternsMap[newState.form.destinationIndex] !== undefined;
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
