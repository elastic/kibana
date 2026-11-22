/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantItem,
  SignificantItemGroup,
  SignificantItemHistogram,
  SignificantItemGroupHistogram,
} from '@kbn/ml-agg-utils';

import type { WindowParameters } from '../window_parameters';
import type { LogRateAnalysisType } from '../log_rate_analysis_type';

export const STREAM_SLICE_NAME = 'logRateAnalysisResults';

// Plain action creators so the server can build stream actions without loading Redux Toolkit.
const createStreamAction =
  <Payload = void>() =>
  <Name extends string>(name: Name) => {
    const type = `${STREAM_SLICE_NAME}/${name}` as const;
    return Object.assign((payload: Payload) => ({ type, payload }), { type });
  };

export const addSignificantItems = createStreamAction<SignificantItem[]>()('addSignificantItems');
export const addSignificantItemsHistogram = createStreamAction<SignificantItemHistogram[]>()(
  'addSignificantItemsHistogram'
);
export const addSignificantItemsGroup = createStreamAction<SignificantItemGroup[]>()(
  'addSignificantItemsGroup'
);
export const addSignificantItemsGroupHistogram = createStreamAction<
  SignificantItemGroupHistogram[]
>()('addSignificantItemsGroupHistogram');
export const addError = createStreamAction<string>()('addError');
export const ping = createStreamAction()('ping');
export const resetErrors = createStreamAction()('resetErrors');
export const resetGroups = createStreamAction()('resetGroups');
export const resetResults = createStreamAction()('resetResults');
export const updateLoadingState = createStreamAction<{
  ccsWarning: boolean;
  loaded: number;
  loadingState: string;
  remainingKeywordFieldCandidates?: string[];
  remainingTextFieldCandidates?: string[];
  groupsMissing?: boolean;
}>()('updateLoadingState');
export const setZeroDocsFallback = createStreamAction<boolean>()('setZeroDocsFallback');
export const setCurrentAnalysisType = createStreamAction<LogRateAnalysisType | undefined>()(
  'setCurrentAnalysisType'
);
export const setCurrentAnalysisWindowParameters = createStreamAction<
  WindowParameters | undefined
>()('setCurrentAnalysisWindowParameters');

export const streamReducerActions = {
  addSignificantItems,
  addSignificantItemsHistogram,
  addSignificantItemsGroup,
  addSignificantItemsGroupHistogram,
  addError,
  ping,
  resetErrors,
  resetGroups,
  resetResults,
  updateLoadingState,
  setZeroDocsFallback,
  setCurrentAnalysisType,
  setCurrentAnalysisWindowParameters,
};

type StreamReducerActions = typeof streamReducerActions;
export type ApiActionName = keyof StreamReducerActions;
export type AiopsLogRateAnalysisApiAction = ReturnType<StreamReducerActions[ApiActionName]>;
