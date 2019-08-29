/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeepPartial } from '../../../../../../common/types/common';
import { checkPermission } from '../../../../../privilege/check_privilege';

import { DataFrameAnalyticsId, DataFrameAnalyticsOutlierConfig } from '../../../../common';

const ANALYTICS_DETAULT_MODEL_MEMORY_LIMIT = '50mb';

export type EsIndexName = string;
export type IndexPatternTitle = string;

export interface FormMessage {
  error?: string;
  message: string;
}

export interface State {
  advancedEditorMessages: FormMessage[];
  advancedEditorRawString: string;
  form: {
    createIndexPattern: boolean;
    destinationIndex: EsIndexName;
    destinationIndexNameExists: boolean;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameValid: boolean;
    destinationIndexPatternTitleExists: boolean;
    jobId: DataFrameAnalyticsId;
    jobIdExists: boolean;
    jobIdEmpty: boolean;
    jobIdValid: boolean;
    sourceIndex: EsIndexName;
    sourceIndexNameExists: boolean;
    sourceIndexNameEmpty: boolean;
    sourceIndexNameValid: boolean;
  };
  disabled: boolean;
  indexNames: EsIndexName[];
  indexPatternTitles: IndexPatternTitle[];
  indexPatternsWithNumericFields: IndexPatternTitle[];
  isAdvancedEditorEnabled: boolean;
  isJobCreated: boolean;
  isJobStarted: boolean;
  isModalButtonDisabled: boolean;
  isModalVisible: boolean;
  isValid: boolean;
  jobConfig: DeepPartial<DataFrameAnalyticsOutlierConfig>;
  jobIds: DataFrameAnalyticsId[];
  requestMessages: FormMessage[];
}

export const getInitialState = (): State => ({
  advancedEditorMessages: [],
  advancedEditorRawString: '',
  form: {
    createIndexPattern: false,
    destinationIndex: '',
    destinationIndexNameExists: false,
    destinationIndexNameEmpty: true,
    destinationIndexNameValid: false,
    destinationIndexPatternTitleExists: false,
    jobId: '',
    jobIdExists: false,
    jobIdEmpty: true,
    jobIdValid: false,
    sourceIndex: '',
    sourceIndexNameExists: false,
    sourceIndexNameEmpty: true,
    sourceIndexNameValid: false,
  },
  jobConfig: {},
  disabled:
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics'),
  indexNames: [],
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
): DeepPartial<DataFrameAnalyticsOutlierConfig> => {
  return {
    source: {
      index: formState.sourceIndex,
    },
    dest: {
      index: formState.destinationIndex,
    },
    analysis: {
      outlier_detection: {},
    },
    model_memory_limit: ANALYTICS_DETAULT_MODEL_MEMORY_LIMIT,
  };
};
