/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamReducerActions } from './stream_reducer';

type StreamReducerActions = typeof streamReducerActions;
export type ApiActionName = keyof StreamReducerActions;
export type AiopsLogRateAnalysisApiAction = ReturnType<StreamReducerActions[ApiActionName]>;

export const {
  addError,
  addSignificantItems,
  addSignificantItemsGroup,
  addSignificantItemsGroupHistogram,
  addSignificantItemsHistogram,
  ping,
  resetAll,
  resetErrors,
  resetGroups,
  setZeroDocsFallback,
  updateLoadingState,
} = streamReducerActions;
