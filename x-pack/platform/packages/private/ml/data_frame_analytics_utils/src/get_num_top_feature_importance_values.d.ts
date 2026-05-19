import type { AnalysisConfig, ClassificationAnalysis, RegressionAnalysis } from './types';
/**
 * Get the `num_top_feature_importance_values` attribute of DFA regression and classification configurations
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['num_top_feature_importance_values']
  | ClassificationAnalysis['classification']['num_top_feature_importance_values'])}
 */
export declare const getNumTopFeatureImportanceValues: (analysis: AnalysisConfig) => RegressionAnalysis["regression"]["num_top_feature_importance_values"] | ClassificationAnalysis["classification"]["num_top_feature_importance_values"];
