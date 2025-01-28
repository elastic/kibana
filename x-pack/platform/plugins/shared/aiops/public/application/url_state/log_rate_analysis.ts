/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';

import { getDefaultAiOpsListState, type AiOpsFullIndexBasedAppState } from './common';

export interface LogRateAnalysisPageUrlState {
  pageKey: 'logRateAnalysis';
  pageUrlState: LogRateAnalysisAppState;
}
/**
 * To avoid long urls, we store the window parameters in the url state not with
 * their full parameters names but with abbrevations. `windowParametersToAppState` and
 * `appStateToWindowParameters` are used to transform the data structure.
 */
export interface LogRateAnalysisAppState extends AiOpsFullIndexBasedAppState {
  /** Window parameters */
  wp?: {
    /** Baseline minimum value */
    bMin: number;
    /** Baseline maximum value */
    bMax: number;
    /** Deviation minimum value */
    dMin: number;
    /** Deviation maximum value */
    dMax: number;
  };
}

/**
 * Transforms a full window parameters object to the abbreviated url state version.
 */
export const windowParametersToAppState = (wp?: WindowParameters): LogRateAnalysisAppState['wp'] =>
  wp && {
    bMin: wp.baselineMin,
    bMax: wp.baselineMax,
    dMin: wp.deviationMin,
    dMax: wp.deviationMax,
  };

/**
 * Transforms an abbreviated url state version of window parameters to its full version.
 */
export const appStateToWindowParameters = (
  wp: LogRateAnalysisAppState['wp']
): WindowParameters | undefined =>
  wp && {
    baselineMin: wp.bMin,
    baselineMax: wp.bMax,
    deviationMin: wp.dMin,
    deviationMax: wp.dMax,
  };

export const getDefaultLogRateAnalysisAppState = (
  overrides?: Partial<LogRateAnalysisAppState>
): LogRateAnalysisAppState => {
  return {
    wp: undefined,
    ...getDefaultAiOpsListState(overrides),
  };
};
