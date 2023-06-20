/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalysisConfig, ClassificationAnalysis, RegressionAnalysis } from './types';
import { isClassificationAnalysis, isRegressionAnalysis } from './analytics_utils';

/**
 * Get the `num_top_feature_importance_values` attribute of DFA regression and classification configurations
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['num_top_feature_importance_values']
  | ClassificationAnalysis['classification']['num_top_feature_importance_values'])}
 */
export const getNumTopFeatureImportanceValues = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['num_top_feature_importance_values']
  | ClassificationAnalysis['classification']['num_top_feature_importance_values'] => {
  let numTopFeatureImportanceValues;
  if (
    isRegressionAnalysis(analysis) &&
    analysis.regression.num_top_feature_importance_values !== undefined
  ) {
    numTopFeatureImportanceValues = analysis.regression.num_top_feature_importance_values;
  } else if (
    isClassificationAnalysis(analysis) &&
    analysis.classification.num_top_feature_importance_values !== undefined
  ) {
    numTopFeatureImportanceValues = analysis.classification.num_top_feature_importance_values;
  }
  return numTopFeatureImportanceValues;
};
