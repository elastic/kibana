/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { OutputAPI } from '@kbn/inference-common';
import {
  createImprovementAnalyzer,
  type ImprovementAnalyzerConfig,
  type ImprovementAnalyzer,
} from '../improvement_analyzer';
import {
  createTracePreprocessor,
  type TracePreprocessorConfig,
  type PreprocessedTrace,
  type FetchTraceOptions,
} from './trace_preprocessor';

// Re-export schemas
export {
  improvementSuggestionCategorySchema,
  improvementSuggestionImpactSchema,
  improvementSuggestionConfidenceSchema,
  improvementSuggestionEvidenceSchema,
  improvementSuggestionSchema,
  improvementSuggestionSummarySchema,
  improvementSuggestionAnalysisResultSchema,
  llmImprovementSuggestionsResponseSchema,
  type ImprovementSuggestionCategorySchema,
  type ImprovementSuggestionImpactSchema,
  type ImprovementSuggestionConfidenceSchema,
  type ImprovementSuggestionEvidenceSchema,
  type ImprovementSuggestionSchema,
  type ImprovementSuggestionSummarySchema,
  type ImprovementSuggestionAnalysisResultSchema,
  type LlmImprovementSuggestionsResponseSchema,
} from './schemas';

// Re-export trace analysis schemas
export {
  traceSpanKindSchema,
  traceSpanStatusSchema,
  traceIssueSeveritySchema,
  tracePatternTypeSchema,
  traceAnalysisPatternSchema,
  traceAnalysisIssueSchema,
  traceTokenAnalysisSchema,
  traceLatencyAnalysisSchema,
  traceToolAnalysisSchema,
  traceLlmCallAnalysisSchema,
  traceErrorAnalysisSchema,
  traceAnalysisResultSchema,
  traceAnalysisInputSchema,
  llmTraceAnalysisResponseSchema,
  batchTraceAnalysisInputSchema,
  batchTraceAnalysisSummarySchema,
  // Cross-trace pattern analysis schemas
  crossTracePatternTypeSchema,
  crossTracePatternSchema,
  traceClusterSchema,
  traceAnomalySchema,
  crossTraceCorrelationSchema,
  crossTraceAnalysisResultSchema,
  type TraceSpanKind,
  type TraceSpanStatus,
  type TraceIssueSeverity,
  type TracePatternType,
  type TraceAnalysisPattern,
  type TraceAnalysisIssue,
  type TraceTokenAnalysis,
  type TraceLatencyAnalysis,
  type TraceToolAnalysis,
  type TraceLlmCallAnalysis,
  type TraceErrorAnalysis,
  type TraceAnalysisResult,
  type TraceAnalysisInput,
  type LlmTraceAnalysisResponse,
  type BatchTraceAnalysisInput,
  type BatchTraceAnalysisSummary,
  // Cross-trace pattern analysis types
  type CrossTracePatternType,
  type CrossTracePattern,
  type TraceCluster,
  type TraceAnomaly,
  type CrossTraceCorrelation,
  type CrossTraceAnalysisResult,
} from './analysis_schemas';

// Re-export trace preprocessor utilities
export {
  createTracePreprocessor,
  validateTraceId,
  formatTraceForPrompt,
  traceToSummarizeInput,
  filterTraceSpans,
  summarizeTraces,
  preprocessTraces,
  type RawSpanData,
  type NormalizedSpan,
  type TraceMetrics,
  type PreprocessedTrace,
  type TracePreprocessorConfig,
  type FetchTraceOptions,
  type PreprocessTracesOptions,
  type PreprocessTracesResult,
} from './trace_preprocessor';

// Re-export prompts
export {
  // Analysis prompt
  ANALYSIS_SYSTEM_PROMPT,
  generateAnalysisUserPrompt,
  buildAnalysisPrompt,
  cleanPrompt,
  type AnalysisPromptInput,
  // Summarize prompt
  SUMMARIZE_SYSTEM_PROMPT,
  generateSummarizeUserPrompt,
  buildSummarizePrompt,
  type SummarizePromptInput,
  // Category-specific prompts
  PROMPT_CATEGORY_PROMPT,
  TOOL_SELECTION_CATEGORY_PROMPT,
  RESPONSE_QUALITY_CATEGORY_PROMPT,
  CONTEXT_RETRIEVAL_CATEGORY_PROMPT,
  REASONING_CATEGORY_PROMPT,
  ACCURACY_CATEGORY_PROMPT,
  EFFICIENCY_CATEGORY_PROMPT,
  OTHER_CATEGORY_PROMPT,
  getPromptCategoryGuidance,
  getToolSelectionCategoryGuidance,
  getResponseQualityCategoryGuidance,
  getContextRetrievalCategoryGuidance,
  getReasoningCategoryGuidance,
  getAccuracyCategoryGuidance,
  getEfficiencyCategoryGuidance,
  getOtherCategoryGuidance,
  CATEGORY_PROMPTS,
  getCategoryPrompt,
  getCategoryGuidance,
  getCategoryPromptsForCategories,
  getAllCategoryPrompts,
  getAvailableCategories,
} from './prompts';

// Re-export improvement analyzer
export {
  createImprovementAnalyzer,
  type ImprovementAnalyzerConfig,
  type ImprovementAnalyzer,
  type AnalyzeExperimentInput,
} from '../improvement_analyzer';

// Re-export suggestion aggregator
export {
  createSuggestionAggregator,
  calculateJaccardSimilarity,
  calculateLevenshteinSimilarity,
  calculateCombinedSimilarity,
  type SuggestionAggregator,
  type SuggestionAggregatorConfig,
  type AggregatedSuggestion,
  type AggregatedSuggestionSource,
  type SuggestionAggregationResult,
} from '../suggestion_aggregator';

// Re-export token efficiency analyzer
export {
  createTokenEfficiencyAnalyzer,
  type TokenEfficiencyAnalyzer,
  type TokenEfficiencyAnalyzerConfig,
  type TokenEfficiencyResult,
  type AggregatedTokenEfficiencyResult,
} from './token_efficiency_analyzer';

// Re-export trace analysis engine
export {
  createTraceAnalysisEngine,
  type TraceAnalysisEngine,
  type TraceAnalysisEngineConfig,
  type TraceAnalysisEngineResult,
  type BatchTraceAnalysisResult,
} from './trace_analysis_engine';

// Re-export cross-trace pattern analyzer
export {
  createCrossTracePatternAnalyzer,
  type CrossTracePatternAnalyzer,
  type CrossTracePatternAnalyzerConfig,
} from './cross_trace_pattern_analyzer';

/**
 * Configuration for the improvement suggestions service factory.
 */
export interface ImprovementSuggestionsServiceConfig {
  /** Elasticsearch client for trace preprocessing (optional) */
  esClient?: EsClient;
  /** Output API for LLM-based analysis (optional) */
  output?: OutputAPI;
  /** Connector ID for the LLM (required if output is provided) */
  connectorId?: string;
  /** Model identifier used for analysis */
  analyzerModel?: string;
  /** Index pattern for trace queries (default: 'traces-*') */
  traceIndexPattern?: string;
  /** Maximum spans to fetch per trace (default: 1000) */
  maxSpansPerTrace?: number;
  /** Retry count for trace fetching (default: 3) */
  traceRetries?: number;
  /** Enable heuristic-based analysis (default: true) */
  enableHeuristics?: boolean;
  /** Minimum score threshold to consider as low-performing (default: 0.7) */
  lowScoreThreshold?: number;
  /** Minimum examples to generate a suggestion (default: 2) */
  minExamplesForSuggestion?: number;
  /** Maximum suggestions to generate (default: 10) */
  maxSuggestions?: number;
}

/**
 * Improvement suggestions service combining trace preprocessing and analysis.
 */
export interface ImprovementSuggestionsService {
  /** The improvement analyzer instance */
  analyzer: ImprovementAnalyzer;
  /** The trace preprocessor instance (if ES client was provided) */
  tracePreprocessor: ReturnType<typeof createTracePreprocessor> | null;
  /**
   * Fetches a trace by ID (requires ES client).
   * @throws Error if ES client was not provided during initialization.
   */
  fetchTrace: (traceId: string, options?: FetchTraceOptions) => Promise<PreprocessedTrace>;
  /**
   * Fetches multiple traces by ID (requires ES client).
   * @throws Error if ES client was not provided during initialization.
   */
  fetchTraces: (
    traceIds: string[],
    options?: FetchTraceOptions
  ) => Promise<Map<string, PreprocessedTrace | Error>>;
  /**
   * Analyzes an experiment and generates improvement suggestions.
   */
  analyze: ImprovementAnalyzer['analyze'];
  /**
   * Analyzes using only heuristic methods (no LLM).
   */
  analyzeHeuristic: ImprovementAnalyzer['analyzeHeuristic'];
  /**
   * Analyzes using LLM (requires output API and connectorId).
   */
  analyzeLlm: ImprovementAnalyzer['analyzeLlm'];
  /**
   * Analyzes multiple experiments.
   */
  analyzeMultiple: ImprovementAnalyzer['analyzeMultiple'];
  /**
   * Merges multiple analysis results.
   */
  mergeResults: ImprovementAnalyzer['mergeResults'];
}

/**
 * Creates an improvement suggestions service that combines trace preprocessing
 * and evaluation analysis capabilities.
 *
 * @example
 * ```typescript
 * // Basic usage with heuristics only
 * const service = createImprovementSuggestionsService({});
 * const result = await service.analyze({ experiment });
 *
 * // With LLM analysis
 * const service = createImprovementSuggestionsService({
 *   output: inferenceClient.output,
 *   connectorId: 'my-connector',
 *   analyzerModel: 'gpt-4',
 * });
 *
 * // With trace preprocessing
 * const service = createImprovementSuggestionsService({
 *   esClient,
 *   traceIndexPattern: 'traces-apm-*',
 * });
 * const trace = await service.fetchTrace(traceId);
 * ```
 *
 * @param config - Configuration options for the service
 * @returns An improvement suggestions service instance
 */
export function createImprovementSuggestionsService(
  config: ImprovementSuggestionsServiceConfig = {}
): ImprovementSuggestionsService {
  const {
    esClient,
    output,
    connectorId,
    analyzerModel,
    traceIndexPattern = 'traces-*',
    maxSpansPerTrace = 1000,
    traceRetries = 3,
    enableHeuristics = true,
    lowScoreThreshold = 0.7,
    minExamplesForSuggestion = 2,
    maxSuggestions = 10,
  } = config;

  // Create the analyzer
  const analyzerConfig: ImprovementAnalyzerConfig = {
    output,
    connectorId,
    analyzerModel,
    enableHeuristics,
    lowScoreThreshold,
    minExamplesForSuggestion,
    maxSuggestions,
  };
  const analyzer = createImprovementAnalyzer(analyzerConfig);

  // Create the trace preprocessor if ES client is provided
  let tracePreprocessor: ReturnType<typeof createTracePreprocessor> | null = null;
  if (esClient) {
    const traceConfig: TracePreprocessorConfig = {
      esClient,
      indexPattern: traceIndexPattern,
      maxSpans: maxSpansPerTrace,
      retries: traceRetries,
    };
    tracePreprocessor = createTracePreprocessor(traceConfig);
  }

  // Trace fetching methods with error handling for missing ES client
  const fetchTrace = async (
    traceId: string,
    options?: FetchTraceOptions
  ): Promise<PreprocessedTrace> => {
    if (!tracePreprocessor) {
      throw new Error(
        'Trace preprocessing requires an Elasticsearch client. ' +
          'Provide esClient in the service configuration.'
      );
    }
    return tracePreprocessor.fetchTrace(traceId, options);
  };

  const fetchTraces = async (
    traceIds: string[],
    options?: FetchTraceOptions
  ): Promise<Map<string, PreprocessedTrace | Error>> => {
    if (!tracePreprocessor) {
      throw new Error(
        'Trace preprocessing requires an Elasticsearch client. ' +
          'Provide esClient in the service configuration.'
      );
    }
    return tracePreprocessor.fetchTraces(traceIds, options);
  };

  return {
    analyzer,
    tracePreprocessor,
    fetchTrace,
    fetchTraces,
    analyze: analyzer.analyze,
    analyzeHeuristic: analyzer.analyzeHeuristic,
    analyzeLlm: analyzer.analyzeLlm,
    analyzeMultiple: analyzer.analyzeMultiple,
    mergeResults: analyzer.mergeResults,
  };
}

/**
 * Type for the improvement suggestions service.
 */
export type { ImprovementSuggestionsService as ImprovementSuggestionsServiceType };
