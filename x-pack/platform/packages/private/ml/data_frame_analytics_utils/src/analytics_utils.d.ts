import type { AnalysisConfig, ClassificationAnalysis, OutlierAnalysis, RegressionAnalysis, DataFrameAnalysisConfigType } from './types';
/**
 * Type guard for DFA outlier analysis configurations
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is OutlierAnalysis}
 */
export declare const isOutlierAnalysis: (arg: unknown) => arg is OutlierAnalysis;
/**
 * Type guard for DFA regression analysis configurations
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is RegressionAnalysis}
 */
export declare const isRegressionAnalysis: (arg: unknown) => arg is RegressionAnalysis;
/**
 * Type guard for DFA classification analysis configurations
 *
 * @param {unknown} arg The config to identify
 * @returns {arg is ClassificationAnalysis}
 */
export declare const isClassificationAnalysis: (arg: unknown) => arg is ClassificationAnalysis;
/**
 * Helper function to get the dependent variable of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['dependent_variable'] | ClassificationAnalysis['classification']['dependent_variable'])}
 */
export declare const getDependentVar: (analysis: AnalysisConfig) => RegressionAnalysis["regression"]["dependent_variable"] | ClassificationAnalysis["classification"]["dependent_variable"];
/**
 * Helper function to get the prediction field name of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['prediction_field_name'] | ClassificationAnalysis['classification']['prediction_field_name'])}
 */
export declare const getPredictionFieldName: (analysis: AnalysisConfig) => RegressionAnalysis["regression"]["prediction_field_name"] | ClassificationAnalysis["classification"]["prediction_field_name"];
/**
 * Helper function to get the default prediction field name
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {string}
 */
export declare const getDefaultPredictionFieldName: (analysis: AnalysisConfig) => string;
/**
 * Helper function to get the predicted field name
 *
 * @param {string} resultsField
 * @param {AnalysisConfig} analysis The analysis configuration
 * @param {?boolean} [forSort]
 * @returns {string}
 */
export declare const getPredictedFieldName: (resultsField: string, analysis: AnalysisConfig, forSort?: boolean) => string;
/**
 * Helper function to get the analysis type of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(DataFrameAnalysisConfigType | 'unknown')}
 */
export declare const getAnalysisType: (analysis: AnalysisConfig) => DataFrameAnalysisConfigType | "unknown";
/**
 * Helper function to get the training percent of a DFA configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {(| RegressionAnalysis['regression']['training_percent'] | ClassificationAnalysis['classification']['training_percent'] | undefined)}
 */
export declare const getTrainingPercent: (analysis: AnalysisConfig) => RegressionAnalysis["regression"]["training_percent"] | ClassificationAnalysis["classification"]["training_percent"] | undefined;
