/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYSIS_CONFIG_TYPE } from './constants';
import type {
  AnalysisConfig,
  ClassificationAnalysis,
  OutlierAnalysis,
  RegressionAnalysis,
  DataFrameAnalysisConfigType,
} from './types';

/**
 * Type guard for DFA outlier analysis configurations
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is OutlierAnalysis}
 */
export const isOutlierAnalysis = (arg: unknown): arg is OutlierAnalysis => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;
};

/**
 * Type guard for DFA regression analysis configurations
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is RegressionAnalysis}
 */
export const isRegressionAnalysis = (arg: unknown): arg is RegressionAnalysis => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION;
};

/**
 * Type guard for DFA classification analysis configurations
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is ClassificationAnalysis}
 */
export const isClassificationAnalysis = (arg: unknown): arg is ClassificationAnalysis => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;
};

/**
 * Helper function to get the dependent variable of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['dependent_variable'] | ClassificationAnalysis['classification']['dependent_variable'])}
 */
export const getDependentVar = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['dependent_variable']
  | ClassificationAnalysis['classification']['dependent_variable'] => {
  let depVar = '';

  if (isRegressionAnalysis(analysis)) {
    depVar = analysis.regression.dependent_variable;
  }

  if (isClassificationAnalysis(analysis)) {
    depVar = analysis.classification.dependent_variable;
  }
  return depVar;
};

/**
 * Helper function to get the prediction field name of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['prediction_field_name'] | ClassificationAnalysis['classification']['prediction_field_name'])}
 */
export const getPredictionFieldName = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['prediction_field_name']
  | ClassificationAnalysis['classification']['prediction_field_name'] => {
  // If undefined will be defaulted to dependent_variable when config is created
  let predictionFieldName;
  if (isRegressionAnalysis(analysis) && analysis.regression.prediction_field_name !== undefined) {
    predictionFieldName = analysis.regression.prediction_field_name;
  } else if (
    isClassificationAnalysis(analysis) &&
    analysis.classification.prediction_field_name !== undefined
  ) {
    predictionFieldName = analysis.classification.prediction_field_name;
  }
  return predictionFieldName;
};

/**
 * Helper function to get the default prediction field name
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {string}
 */
export const getDefaultPredictionFieldName = (analysis: AnalysisConfig) => {
  return `${getDependentVar(analysis)}_prediction`;
};

/**
 * Helper function to get the predicted field name
 *
 * @param {string} resultsField
 * @param {AnalysisConfig} analysis The analysis configuration
 * @param {?boolean} [forSort]
 * @returns {string}
 */
export const getPredictedFieldName = (
  resultsField: string,
  analysis: AnalysisConfig,
  forSort?: boolean
) => {
  // default is 'ml'
  const predictionFieldName = getPredictionFieldName(analysis);
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : getDefaultPredictionFieldName(analysis)
  }`;
  return predictedField;
};

/**
 * Helper function to get the analysis type of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(DataFrameAnalysisConfigType | 'unknown')}
 */
export const getAnalysisType = (
  analysis: AnalysisConfig
): DataFrameAnalysisConfigType | 'unknown' => {
  const keys = Object.keys(analysis || {});

  if (keys.length === 1) {
    return keys[0] as DataFrameAnalysisConfigType;
  }

  return 'unknown';
};

/**
 * Helper function to get the training percent of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['training_percent'] | ClassificationAnalysis['classification']['training_percent'] | undefined)}
 */
export const getTrainingPercent = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['training_percent']
  | ClassificationAnalysis['classification']['training_percent']
  | undefined => {
  let trainingPercent;

  if (isRegressionAnalysis(analysis)) {
    trainingPercent = analysis.regression.training_percent;
  }

  if (isClassificationAnalysis(analysis)) {
    trainingPercent = analysis.classification.training_percent;
  }
  return trainingPercent;
};
