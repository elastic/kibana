/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeepPartial } from '../../../../../../common/types/common';
import { checkPermission } from '../../../../../privilege/check_privilege';
import { mlNodesAvailable } from '../../../../../ml_nodes_check/check_ml_nodes';

import { DataFrameAnalyticsId, DataFrameAnalyticsConfig } from '../../../../common';

const OUTLIER_DETECTION_DEFAULT_MODEL_MEMORY_LIMIT = '50mb';
const REGRESSION_DEFAULT_MODEL_MEMORY_LIMIT = '100mb';

export type EsIndexName = string;
export type DependentVariable = string;
export type IndexPatternTitle = string;
export type AnalyticsJobType = JOB_TYPES | undefined;
type IndexPatternId = string;
export type SourceIndexMap = Record<
  IndexPatternTitle,
  { label: IndexPatternTitle; value: IndexPatternId }
>;

export interface FormMessage {
  error?: string;
  message: string;
}

export enum JOB_TYPES {
  OUTLIER_DETECTION = 'outlier_detection',
  REGRESSION = 'regression',
}

export interface State {
  advancedEditorMessages: FormMessage[];
  advancedEditorRawString: string;
  form: {
    createIndexPattern: boolean;
    dependentVariable: DependentVariable;
    dependentVariableFetchFail: boolean;
    dependentVariableOptions: Array<{ label: DependentVariable }> | [];
    destinationIndex: EsIndexName;
    destinationIndexNameExists: boolean;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameValid: boolean;
    destinationIndexPatternTitleExists: boolean;
    jobId: DataFrameAnalyticsId;
    jobIdExists: boolean;
    jobIdEmpty: boolean;
    jobIdInvalidMaxLength: boolean;
    jobIdValid: boolean;
    jobType: AnalyticsJobType;
    loadingDepFieldOptions: boolean;
    sourceIndex: EsIndexName;
    sourceIndexNameEmpty: boolean;
    sourceIndexNameValid: boolean;
    sourceIndexContainsNumericalFields: boolean;
    sourceIndexFieldsCheckFailed: boolean;
    trainingPercent: number;
  };
  disabled: boolean;
  indexNames: EsIndexName[];
  indexPatternsMap: SourceIndexMap;
  isAdvancedEditorEnabled: boolean;
  isJobCreated: boolean;
  isJobStarted: boolean;
  isModalButtonDisabled: boolean;
  isModalVisible: boolean;
  isValid: boolean;
  jobConfig: DeepPartial<DataFrameAnalyticsConfig>;
  jobIds: DataFrameAnalyticsId[];
  requestMessages: FormMessage[];
}

export const getInitialState = (): State => ({
  advancedEditorMessages: [],
  advancedEditorRawString: '',
  form: {
    createIndexPattern: false,
    dependentVariable: '',
    dependentVariableFetchFail: false,
    dependentVariableOptions: [],
    destinationIndex: '',
    destinationIndexNameExists: false,
    destinationIndexNameEmpty: true,
    destinationIndexNameValid: false,
    destinationIndexPatternTitleExists: false,
    jobId: '',
    jobIdExists: false,
    jobIdEmpty: true,
    jobIdInvalidMaxLength: false,
    jobIdValid: false,
    jobType: undefined,
    loadingDepFieldOptions: false,
    sourceIndex: '',
    sourceIndexNameEmpty: true,
    sourceIndexNameValid: false,
    sourceIndexContainsNumericalFields: true,
    sourceIndexFieldsCheckFailed: false,
    trainingPercent: 80,
  },
  jobConfig: {},
  disabled:
    !mlNodesAvailable() ||
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics'),
  indexNames: [],
  indexPatternsMap: {},
  isAdvancedEditorEnabled: false,
  isJobCreated: false,
  isJobStarted: false,
  isModalVisible: false,
  isModalButtonDisabled: false,
  isValid: false,
  jobIds: [],
  requestMessages: [],
});

export const getJobConfigFromFormState = (
  formState: State['form']
): DeepPartial<DataFrameAnalyticsConfig> => {
  const modelMemoryLimit =
    formState.jobType === JOB_TYPES.REGRESSION
      ? REGRESSION_DEFAULT_MODEL_MEMORY_LIMIT
      : OUTLIER_DETECTION_DEFAULT_MODEL_MEMORY_LIMIT;

  const jobConfig: DeepPartial<DataFrameAnalyticsConfig> = {
    source: {
      // If a Kibana index patterns includes commas, we need to split
      // the into an array of indices to be in the correct format for
      // the data frame analytics API.
      index: formState.sourceIndex.includes(',')
        ? formState.sourceIndex.split(',').map(d => d.trim())
        : formState.sourceIndex,
    },
    dest: {
      index: formState.destinationIndex,
    },
    analyzed_fields: {
      excludes: [],
    },
    analysis: {
      outlier_detection: {},
    },
    model_memory_limit: modelMemoryLimit,
  };

  if (formState.jobType === JOB_TYPES.REGRESSION) {
    jobConfig.analysis = {
      regression: {
        dependent_variable: formState.dependentVariable,
        training_percent: formState.trainingPercent,
      },
    };
  }

  return jobConfig;
};
