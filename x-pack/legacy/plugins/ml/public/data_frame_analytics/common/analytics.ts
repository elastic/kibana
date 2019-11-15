/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { idx } from '@kbn/elastic-idx';
import { ml } from '../../services/ml_api_service';
import { getErrorMessage } from '../pages/analytics_management/hooks/use_create_analytics_form';

export type IndexName = string;
export type IndexPattern = string;
export type DataFrameAnalyticsId = string;

interface OutlierAnalysis {
  outlier_detection: {};
}

interface RegressionAnalysis {
  regression: {
    dependent_variable: string;
    training_percent?: number;
    prediction_field_name?: string;
  };
}

export const SEARCH_SIZE = 1000;

export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface Eval {
  meanSquaredError: number | '';
  rSquared: number | '';
  error: null | string;
}

export interface RegressionEvaluateResponse {
  regression: {
    mean_squared_error: {
      error: number;
    };
    r_squared: {
      value: number;
    };
  };
}

interface GenericAnalysis {
  [key: string]: Record<string, any>;
}

interface LoadEvaluateResult {
  success: boolean;
  eval: RegressionEvaluateResponse | null;
  error: string | null;
}

type AnalysisConfig = OutlierAnalysis | RegressionAnalysis | GenericAnalysis;

export enum ANALYSIS_CONFIG_TYPE {
  OUTLIER_DETECTION = 'outlier_detection',
  REGRESSION = 'regression',
  UNKNOWN = 'unknown',
}

export const getAnalysisType = (analysis: AnalysisConfig) => {
  const keys = Object.keys(analysis);

  if (keys.length === 1) {
    return keys[0];
  }

  return ANALYSIS_CONFIG_TYPE.UNKNOWN;
};

export const getDependentVar = (analysis: AnalysisConfig) => {
  let depVar = '';
  if (isRegressionAnalysis(analysis)) {
    depVar = analysis.regression.dependent_variable;
  }
  return depVar;
};

export const getPredictionFieldName = (analysis: AnalysisConfig) => {
  // If undefined will be defaulted to dependent_variable when config is created
  let predictionFieldName;
  if (isRegressionAnalysis(analysis) && analysis.regression.prediction_field_name !== undefined) {
    predictionFieldName = analysis.regression.prediction_field_name;
  }
  return predictionFieldName;
};

export const getPredictedFieldName = (resultsField: string, analysis: AnalysisConfig) => {
  // default is 'ml'
  const predictionFieldName = getPredictionFieldName(analysis);
  const defaultPredictionField = `${getDependentVar(analysis)}_prediction`;
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }`;
  return predictedField;
};

export const isOutlierAnalysis = (arg: any): arg is OutlierAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;
};

export const isRegressionAnalysis = (arg: any): arg is RegressionAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION;
};

export interface DataFrameAnalyticsConfig {
  id: DataFrameAnalyticsId;
  // Description attribute is not supported yet
  // description?: string;
  dest: {
    index: IndexName;
    results_field: string;
  };
  source: {
    index: IndexName | IndexName[];
  };
  analysis: AnalysisConfig;
  analyzed_fields: {
    includes: string[];
    excludes: string[];
  };
  model_memory_limit: string;
  create_time: number;
  version: string;
}

export enum REFRESH_ANALYTICS_LIST_STATE {
  ERROR = 'error',
  IDLE = 'idle',
  LOADING = 'loading',
  REFRESH = 'refresh',
}
export const refreshAnalyticsList$ = new BehaviorSubject<REFRESH_ANALYTICS_LIST_STATE>(
  REFRESH_ANALYTICS_LIST_STATE.IDLE
);

export const useRefreshAnalyticsList = (
  callback: {
    isLoading?(d: boolean): void;
    onRefresh?(): void;
  } = {}
) => {
  useEffect(() => {
    const distinct$ = refreshAnalyticsList$.pipe(distinctUntilChanged());

    const subscriptions: Subscription[] = [];

    if (typeof callback.onRefresh === 'function') {
      // initial call to refresh
      callback.onRefresh();

      subscriptions.push(
        distinct$
          .pipe(filter(state => state === REFRESH_ANALYTICS_LIST_STATE.REFRESH))
          .subscribe(() => typeof callback.onRefresh === 'function' && callback.onRefresh())
      );
    }

    if (typeof callback.isLoading === 'function') {
      subscriptions.push(
        distinct$.subscribe(
          state =>
            typeof callback.isLoading === 'function' &&
            callback.isLoading(state === REFRESH_ANALYTICS_LIST_STATE.LOADING)
        )
      );
    }

    return () => {
      subscriptions.map(sub => sub.unsubscribe());
    };
  }, []);

  return {
    refresh: () => {
      // A refresh is followed immediately by setting the state to loading
      // to trigger data fetching and loading indicators in one go.
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.LOADING);
    },
  };
};

const DEFAULT_SIG_FIGS = 3;

export function getValuesFromResponse(response: RegressionEvaluateResponse) {
  let meanSquaredError = idx(response, _ => _.regression.mean_squared_error.error) as number;
  if (meanSquaredError) {
    meanSquaredError = Number(meanSquaredError.toPrecision(DEFAULT_SIG_FIGS));
  }

  let rSquared = idx(response, _ => _.regression.r_squared.value) as number;
  if (rSquared) {
    rSquared = Number(rSquared.toPrecision(DEFAULT_SIG_FIGS));
  }

  return { meanSquaredError, rSquared };
}

export const loadEvalData = async ({
  isTraining,
  index,
  dependentVariable,
  resultsField,
  predictionFieldName,
}: {
  isTraining: boolean;
  index: string;
  dependentVariable: string;
  resultsField: string;
  predictionFieldName?: string;
}) => {
  const results: LoadEvaluateResult = { success: false, eval: null, error: null };
  const defaultPredictionField = `${dependentVariable}_prediction`;
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }`;

  const query = { term: { [`${resultsField}.is_training`]: { value: isTraining } } };

  const config = {
    index,
    query,
    evaluation: {
      regression: {
        actual_field: dependentVariable,
        predicted_field: predictedField,
        metrics: {
          r_squared: {},
          mean_squared_error: {},
        },
      },
    },
  };

  try {
    const evalResult = await ml.dataFrameAnalytics.evaluateDataFrameAnalytics(config);
    results.success = true;
    results.eval = evalResult;
    return results;
  } catch (e) {
    results.error = getErrorMessage(e);
    return results;
  }
};
