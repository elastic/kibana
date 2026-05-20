import type { ClassificationAnalysis, AnalysisConfig } from './types';
/**
 * Get the `num_top_classes` attribute of a DFA classification configuration
 *
 * @param {AnalysisConfig} analysis The analysis configuration
 * @returns {ClassificationAnalysis['classification']['num_top_classes']}
 */
export declare const getNumTopClasses: (analysis: AnalysisConfig) => ClassificationAnalysis["classification"]["num_top_classes"];
