/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeepPartial } from '../../../../../../common/types/common';
import { checkPermission } from '../../../../../privilege/check_privilege';

import { DataFrameAnalyticsId, DataFrameAnalyticsConfig } from '../../../../common';

const ANALYTICS_DETAULT_MODEL_MEMORY_LIMIT = '50mb';

export type EsIndexName = string;
export type DependentVariable = string;
export type IndexPatternTitle = string;
export type AnalyticsJobType = JOB_TYPES | undefined;

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
    trainingPercent: number;
  };
  disabled: boolean;
  indexNames: EsIndexName[];
  indexPatternsMap: any; // TODO: update type
  indexPatternTitles: IndexPatternTitle[];
  indexPatternsWithNumericFields: IndexPatternTitle[];
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
    trainingPercent: 80,
  },
  jobConfig: {},
  disabled:
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics'),
  indexNames: [],
  indexPatternsMap: {},
  indexPatternTitles: [],
  indexPatternsWithNumericFields: [],
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
    model_memory_limit: ANALYTICS_DETAULT_MODEL_MEMORY_LIMIT,
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
