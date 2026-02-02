/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputAPI } from '@kbn/inference-common';
import type { RanExperiment, EvalTraceCorrelation } from '../types';

/**
 * Category of analysis that an analyzer can perform.
 */
export type AnalyzerCategory =
  | 'improvement'
  | 'performance'
  | 'quality'
  | 'trace'
  | 'comparison'
  | 'trend'
  | 'custom';

/**
 * Impact level indicating the significance of an analysis finding.
 */
export type AnalysisImpact = 'high' | 'medium' | 'low';

/**
 * Confidence level indicating how certain the analysis is about its findings.
 */
export type AnalysisConfidence = 'high' | 'medium' | 'low';

/**
 * Method used for analysis by base analyzers.
 * - 'llm': Uses LLM-based analysis
 * - 'heuristic': Uses rule-based heuristic analysis
 * - 'hybrid': Combines both LLM and heuristic approaches
 */
export type AnalyzerMethod = 'llm' | 'heuristic' | 'hybrid';

/**
 * Base evidence type supporting an analysis finding.
 */
export interface AnalysisEvidence {
  /** Source of the evidence (e.g., evaluator name, metric name) */
  source: string;
  /** Type of evidence */
  type: 'evaluator' | 'metric' | 'trace' | 'pattern' | 'comparison';
  /** Indices of examples that contributed to this evidence */
  exampleIndices?: number[];
  /** Relevant score or metric value */
  score?: number;
  /** Description of the evidence */
  description?: string;
  /** Additional context or details */
  details?: Record<string, unknown>;
}

/**
 * Base finding type returned by analyzers.
 */
export interface AnalysisFinding {
  /** Unique identifier for the finding */
  id: string;
  /** Short descriptive title */
  title: string;
  /** Detailed description of the finding */
  description: string;
  /** Category of the finding */
  category: string;
  /** Impact level of the finding */
  impact: AnalysisImpact;
  /** Confidence level in this finding */
  confidence: AnalysisConfidence;
  /** Evidence supporting this finding */
  evidence: AnalysisEvidence[];
  /** Recommended action items */
  actionItems?: string[];
  /** Priority score for ranking (0-1 scale) */
  priorityScore?: number;
  /** Tags for filtering and categorization */
  tags?: string[];
}

/**
 * Summary statistics for analysis findings.
 */
export interface AnalysisFindingSummary {
  /** Total number of findings */
  totalFindings: number;
  /** Breakdown by impact level */
  byImpact: Record<AnalysisImpact, number>;
  /** Breakdown by category */
  byCategory: Record<string, number>;
  /** Top priority findings */
  topPriority: AnalysisFinding[];
}

/**
 * Base analysis result returned by all analyzers.
 */
export interface BaseAnalysisResult<TFinding extends AnalysisFinding = AnalysisFinding> {
  /** List of findings from the analysis */
  findings: TFinding[];
  /** Summary statistics */
  summary: AnalysisFindingSummary;
  /** Metadata about the analysis */
  metadata: AnalysisMetadata;
}

/**
 * Metadata about an analysis execution.
 */
export interface AnalysisMetadata {
  /** Unique identifier for the analysis run */
  analysisId?: string;
  /** ID of the evaluation run that was analyzed */
  runId?: string;
  /** Dataset name that was analyzed */
  datasetName?: string;
  /** Model used in the evaluation being analyzed */
  model?: string;
  /** Timestamp when the analysis was performed */
  analyzedAt: string;
  /** Model used to generate the analysis (if LLM-based) */
  analyzerModel?: string;
  /** Method used for the analysis */
  method?: AnalyzerMethod;
  /** Duration of the analysis in milliseconds */
  durationMs?: number;
  /** Additional custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Base input for analysis operations.
 */
export interface BaseAnalysisInput {
  /** The experiment data to analyze */
  experiment: RanExperiment;
  /** Optional model identifier used in the evaluation */
  model?: string;
  /** Additional context to guide the analysis */
  additionalContext?: string;
}

/**
 * Extended analysis input that includes trace correlations.
 */
export interface TraceAwareAnalysisInput extends BaseAnalysisInput {
  /** Correlated trace data for deeper analysis */
  traceCorrelations?: EvalTraceCorrelation[];
}

/**
 * Base configuration for analyzers.
 */
export interface BaseAnalyzerConfig {
  /** Output API for LLM-based analysis (required for LLM method) */
  output?: OutputAPI;
  /** Connector ID for the LLM (required for LLM method) */
  connectorId?: string;
  /** Model identifier used for analysis */
  analyzerModel?: string;
  /** Analysis method to use */
  method?: AnalyzerMethod;
  /** Enable heuristic-based analysis (for hybrid method) */
  enableHeuristics?: boolean;
  /** Maximum number of findings to return */
  maxFindings?: number;
}

/**
 * Base interface for all analyzers.
 *
 * Analyzers are responsible for examining evaluation results and generating
 * findings (insights, suggestions, issues) based on the data.
 *
 * @template TInput - The input type for analysis
 * @template TResult - The result type from analysis
 * @template TConfig - The configuration type for the analyzer
 */
export interface Analyzer<
  TInput extends BaseAnalysisInput = BaseAnalysisInput,
  TResult extends BaseAnalysisResult = BaseAnalysisResult,
  TConfig extends BaseAnalyzerConfig = BaseAnalyzerConfig
> {
  /** Unique identifier for this analyzer type */
  readonly id: string;

  /** Human-readable name of the analyzer */
  readonly name: string;

  /** Description of what this analyzer does */
  readonly description: string;

  /** Category of analysis this analyzer performs */
  readonly category: AnalyzerCategory;

  /** Current configuration of the analyzer */
  readonly config: TConfig;

  /**
   * Performs analysis on the given input.
   *
   * @param input - The data to analyze
   * @returns Promise resolving to analysis results
   */
  analyze(input: TInput): Promise<TResult>;

  /**
   * Performs LLM-based analysis only.
   * Throws if LLM is not configured.
   *
   * @param input - The data to analyze
   * @returns Promise resolving to analysis results
   */
  analyzeLlm?(input: TInput): Promise<TResult>;

  /**
   * Performs heuristic-based analysis only.
   *
   * @param input - The data to analyze
   * @returns Analysis results (synchronous for heuristics)
   */
  analyzeHeuristic?(input: TInput): TResult;

  /**
   * Validates whether the analyzer can process the given input.
   *
   * @param input - The input to validate
   * @returns True if the input is valid for this analyzer
   */
  canAnalyze?(input: TInput): boolean;

  /**
   * Returns the supported analysis methods for this analyzer.
   */
  getSupportedMethods(): AnalyzerMethod[];

  /**
   * Checks if LLM-based analysis is configured and available.
   */
  isLlmConfigured(): boolean;
}

/**
 * Interface for analyzers that support batch operations.
 *
 * @template TInput - The input type for analysis
 * @template TResult - The result type from analysis
 */
export interface BatchAnalyzer<
  TInput extends BaseAnalysisInput = BaseAnalysisInput,
  TResult extends BaseAnalysisResult = BaseAnalysisResult
> {
  /**
   * Performs analysis on multiple inputs.
   *
   * @param inputs - Array of inputs to analyze
   * @returns Promise resolving to array of analysis results
   */
  analyzeMultiple(inputs: TInput[]): Promise<TResult[]>;

  /**
   * Merges multiple analysis results into a combined result.
   *
   * @param results - Array of analysis results to merge
   * @returns Merged analysis result
   */
  mergeResults(results: TResult[]): TResult;
}

/**
 * Interface for analyzers that can compare results across runs.
 *
 * @template TResult - The result type from analysis
 */
export interface ComparativeAnalyzer<TResult extends BaseAnalysisResult = BaseAnalysisResult> {
  /**
   * Compares analysis results between two runs.
   *
   * @param current - Current analysis result
   * @param reference - Reference analysis result to compare against
   * @returns Comparison of the two results
   */
  compare(
    current: TResult,
    reference: TResult
  ): {
    resolved: string[];
    newIssues: string[];
    persistent: string[];
    improvements: string[];
    regressions: string[];
  };
}

/**
 * Combined interface for analyzers that support all capabilities.
 */
export interface FullAnalyzer<
  TInput extends BaseAnalysisInput = BaseAnalysisInput,
  TResult extends BaseAnalysisResult = BaseAnalysisResult,
  TConfig extends BaseAnalyzerConfig = BaseAnalyzerConfig
> extends Analyzer<TInput, TResult, TConfig>,
    BatchAnalyzer<TInput, TResult>,
    ComparativeAnalyzer<TResult> {}

/**
 * Factory function type for creating analyzers.
 */
export type AnalyzerFactory<
  TInput extends BaseAnalysisInput = BaseAnalysisInput,
  TResult extends BaseAnalysisResult = BaseAnalysisResult,
  TConfig extends BaseAnalyzerConfig = BaseAnalyzerConfig
> = (config: TConfig) => Analyzer<TInput, TResult, TConfig>;

/**
 * Registry entry for an analyzer type.
 */
export interface AnalyzerRegistryEntry<
  TInput extends BaseAnalysisInput = BaseAnalysisInput,
  TResult extends BaseAnalysisResult = BaseAnalysisResult,
  TConfig extends BaseAnalyzerConfig = BaseAnalyzerConfig
> {
  /** Unique identifier for the analyzer type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the analyzer */
  description: string;
  /** Category of analysis */
  category: AnalyzerCategory;
  /** Factory function to create instances */
  factory: AnalyzerFactory<TInput, TResult, TConfig>;
  /** Default configuration */
  defaultConfig?: Partial<TConfig>;
}

/**
 * Helper type to extract the input type from an analyzer.
 */
export type AnalyzerInput<T> = T extends Analyzer<infer TInput, any, any> ? TInput : never;

/**
 * Helper type to extract the result type from an analyzer.
 */
export type AnalyzerResult<T> = T extends Analyzer<any, infer TResult, any> ? TResult : never;

/**
 * Helper type to extract the config type from an analyzer.
 */
export type AnalyzerConfig<T> = T extends Analyzer<any, any, infer TConfig> ? TConfig : never;
