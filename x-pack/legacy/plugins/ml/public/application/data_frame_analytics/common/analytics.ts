/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { cloneDeep } from 'lodash';
import { ml } from '../../services/ml_api_service';
import { Dictionary } from '../../../../common/types/common';
import { getErrorMessage } from '../pages/analytics_management/hooks/use_create_analytics_form';
import { SavedSearchQuery } from '../../contexts/kibana';

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

interface ClassificationAnalysis {
  classification: {
    dependent_variable: string;
    training_percent?: number;
    num_top_classes?: string;
    prediction_field_name?: string;
  };
}

export const SEARCH_SIZE = 1000;

export const defaultSearchQuery = {
  match_all: {},
};

export interface SearchQuery {
  track_total_hits?: boolean;
  query: SavedSearchQuery;
  sort?: any;
}

export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface Eval {
  meanSquaredError: number | string;
  rSquared: number | string;
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

export interface ClassificationEvaluateResponse {
  classification: {
    multiclass_confusion_matrix: {
      confusion_matrix: Array<{
        actual_class: string;
        actual_class_doc_count: number;
        predicted_classes: Array<{ predicted_class: string; count: number }>;
        other_predicted_class_doc_count: number;
      }>;
    };
  };
}

interface GenericAnalysis {
  [key: string]: Record<string, any>;
}

interface LoadEvaluateResult {
  success: boolean;
  eval: RegressionEvaluateResponse | ClassificationEvaluateResponse | null;
  error: string | null;
}

type AnalysisConfig =
  | OutlierAnalysis
  | RegressionAnalysis
  | ClassificationAnalysis
  | GenericAnalysis;

export enum ANALYSIS_CONFIG_TYPE {
  OUTLIER_DETECTION = 'outlier_detection',
  REGRESSION = 'regression',
  CLASSIFICATION = 'classification',
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

  if (isClassificationAnalysis(analysis)) {
    depVar = analysis.classification.dependent_variable;
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

export const getPredictedFieldName = (
  resultsField: string,
  analysis: AnalysisConfig,
  forSort?: boolean
) => {
  // default is 'ml'
  const predictionFieldName = getPredictionFieldName(analysis);
  const defaultPredictionField = `${getDependentVar(analysis)}_prediction`;
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }${isClassificationAnalysis(analysis) && !forSort ? '.keyword' : ''}`;
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

export const isClassificationAnalysis = (arg: any): arg is ClassificationAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;
};

export const isResultsSearchBoolQuery = (arg: any): arg is ResultsSearchBoolQuery => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === 'bool';
};

export const isRegressionEvaluateResponse = (arg: any): arg is RegressionEvaluateResponse => {
  const keys = Object.keys(arg);
  return (
    keys.length === 1 &&
    keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION &&
    arg?.regression?.mean_squared_error !== undefined &&
    arg?.regression?.r_squared !== undefined
  );
};

export const isClassificationEvaluateResponse = (
  arg: any
): arg is ClassificationEvaluateResponse => {
  const keys = Object.keys(arg);
  return (
    keys.length === 1 &&
    keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
    arg?.classification?.multiclass_confusion_matrix !== undefined
  );
};

export interface DataFrameAnalyticsConfig {
  id: DataFrameAnalyticsId;
  // Description attribute is not supported yet
  description?: string;
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
  let meanSquaredError = response?.regression?.mean_squared_error?.error;

  if (meanSquaredError) {
    meanSquaredError = Number(meanSquaredError.toPrecision(DEFAULT_SIG_FIGS));
  }

  let rSquared = response?.regression?.r_squared?.value;
  if (rSquared) {
    rSquared = Number(rSquared.toPrecision(DEFAULT_SIG_FIGS));
  }

  return { meanSquaredError, rSquared };
}
interface ResultsSearchBoolQuery {
  bool: Dictionary<any>;
}
interface ResultsSearchTermQuery {
  term: Dictionary<any>;
}

export type ResultsSearchQuery = ResultsSearchBoolQuery | ResultsSearchTermQuery | SavedSearchQuery;

export function getEvalQueryBody({
  resultsField,
  isTraining,
  searchQuery,
  ignoreDefaultQuery,
}: {
  resultsField: string;
  isTraining: boolean;
  searchQuery?: ResultsSearchQuery;
  ignoreDefaultQuery?: boolean;
}) {
  let query: ResultsSearchQuery = {
    term: { [`${resultsField}.is_training`]: { value: isTraining } },
  };

  if (searchQuery !== undefined && ignoreDefaultQuery === true) {
    query = searchQuery;
  } else if (searchQuery !== undefined && isResultsSearchBoolQuery(searchQuery)) {
    const searchQueryClone = cloneDeep(searchQuery);
    searchQueryClone.bool.must.push(query);
    query = searchQueryClone;
  }
  return query;
}

export const loadEvalData = async ({
  isTraining,
  index,
  dependentVariable,
  resultsField,
  predictionFieldName,
  searchQuery,
  ignoreDefaultQuery,
  jobType,
}: {
  isTraining: boolean;
  index: string;
  dependentVariable: string;
  resultsField: string;
  predictionFieldName?: string;
  searchQuery?: ResultsSearchQuery;
  ignoreDefaultQuery?: boolean;
  jobType: ANALYSIS_CONFIG_TYPE;
}) => {
  const results: LoadEvaluateResult = { success: false, eval: null, error: null };
  const defaultPredictionField = `${dependentVariable}_prediction`;
  let predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }`;

  if (jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) {
    predictedField = `${predictedField}.keyword`;
  }

  const query = getEvalQueryBody({ resultsField, isTraining, searchQuery, ignoreDefaultQuery });
  const metrics = {
    classification: {
      multiclass_confusion_matrix: {},
    },
    regression: {
      r_squared: {},
      mean_squared_error: {},
    },
  };

  const config = {
    index,
    query,
    evaluation: {
      [jobType]: {
        actual_field: dependentVariable,
        predicted_field: predictedField,
        // @ts-ignore
        metrics: metrics[jobType],
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

interface TrackTotalHitsSearchResponse {
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: any[];
  };
}

export const loadDocsCount = async ({
  ignoreDefaultQuery = true,
  isTraining,
  searchQuery,
  resultsField,
  destIndex,
}: {
  ignoreDefaultQuery?: boolean;
  isTraining: boolean;
  searchQuery: SavedSearchQuery;
  resultsField: string;
  destIndex: string;
}): Promise<{
  docsCount: number | null;
  success: boolean;
}> => {
  const query = getEvalQueryBody({ resultsField, isTraining, ignoreDefaultQuery, searchQuery });

  try {
    const body: SearchQuery = {
      track_total_hits: true,
      query,
    };

    const resp: TrackTotalHitsSearchResponse = await ml.esSearch({
      index: destIndex,
      size: 0,
      body,
    });

    const docsCount = resp.hits.total && resp.hits.total.value;
    return { docsCount, success: true };
  } catch (e) {
    return {
      docsCount: null,
      success: false,
    };
  }
};
