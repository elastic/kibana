/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeepPartial } from '../../../../../../../common/types/common';
import { checkPermission } from '../../../../../privilege/check_privilege';
import { mlNodesAvailable } from '../../../../../ml_nodes_check/check_ml_nodes';

import { DataFrameAnalyticsId, DataFrameAnalyticsConfig } from '../../../../common';

export enum DEFAULT_MODEL_MEMORY_LIMIT {
  regression = '100mb',
  // eslint-disable-next-line @typescript-eslint/camelcase
  outlier_detection = '50mb',
  classification = '100mb',
}

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
  CLASSIFICATION = 'classification',
}

export interface Option {
  label: string;
}

export interface State {
  advancedEditorMessages: FormMessage[];
  advancedEditorRawString: string;
  form: {
    createIndexPattern: boolean;
    dependentVariable: DependentVariable;
    dependentVariableFetchFail: boolean;
    dependentVariableOptions: Option[] | [];
    description: string;
    destinationIndex: EsIndexName;
    destinationIndexNameExists: boolean;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameValid: boolean;
    destinationIndexPatternTitleExists: boolean;
    excludes: string[];
    excludesOptions: Option[];
    jobId: DataFrameAnalyticsId;
    jobIdExists: boolean;
    jobIdEmpty: boolean;
    jobIdInvalidMaxLength: boolean;
    jobIdValid: boolean;
    jobType: AnalyticsJobType;
    loadingFieldOptions: boolean;
    modelMemoryLimit: string | undefined;
    modelMemoryLimitUnitValid: boolean;
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
    description: '',
    destinationIndex: '',
    destinationIndexNameExists: false,
    destinationIndexNameEmpty: true,
    destinationIndexNameValid: false,
    destinationIndexPatternTitleExists: false,
    excludes: [],
    excludesOptions: [],
    jobId: '',
    jobIdExists: false,
    jobIdEmpty: true,
    jobIdInvalidMaxLength: false,
    jobIdValid: false,
    jobType: undefined,
    loadingFieldOptions: false,
    modelMemoryLimit: undefined,
    modelMemoryLimitUnitValid: true,
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
  const jobConfig: DeepPartial<DataFrameAnalyticsConfig> = {
    description: formState.description,
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
      excludes: formState.excludes,
    },
    analysis: {
      outlier_detection: {},
    },
    model_memory_limit: formState.modelMemoryLimit,
  };

  if (
    formState.jobType === JOB_TYPES.REGRESSION ||
    formState.jobType === JOB_TYPES.CLASSIFICATION
  ) {
    jobConfig.analysis = {
      [formState.jobType]: {
        dependent_variable: formState.dependentVariable,
        training_percent: formState.trainingPercent,
      },
    };
  }

  return jobConfig;
};
