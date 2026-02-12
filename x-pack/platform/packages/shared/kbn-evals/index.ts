/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// CLI tools
export * as cli from './src/cli';

export { evaluate } from './src/evaluate';
export type { DefaultEvaluators, ReportDisplayOptions } from './src/types';
export type { EvaluationCriterion } from './src/evaluators/criteria';
export { createPlaywrightEvalsConfig } from './src/config/create_playwright_eval_config';
export type {
  Example,
  TaskOutput,
  ExperimentTask,
  Evaluator,
  EvaluationResult,
  RanExperiment,
  EvalsExecutorClient,
} from './src/types';
export {
  KibanaEvalsClient,
  type KibanaEvalsClientOptions,
  type GenerateImprovementSuggestionsOptions,
  type RunExperimentWithSuggestionsOptions,
  type ExperimentWithSuggestionsResult,
} from './src/kibana_evals_executor/client';
export { KibanaPhoenixClient } from './src/kibana_phoenix_client/client';
export { createQuantitativeCorrectnessEvaluators } from './src/evaluators/correctness';
export { createQuantitativeGroundednessEvaluator } from './src/evaluators/groundedness';
export type {
  EvaluationDataset,
  EvaluationWorkerFixtures,
  EvaluationReport,
  TraceLinkInfo,
  ImprovementSuggestionCategory,
  ImprovementSuggestionImpact,
  ImprovementSuggestionConfidence,
  ImprovementSuggestionEvidence,
  ImprovementSuggestion,
  ImprovementSuggestionSummary,
  ImprovementSuggestionAnalysisResult,
  EvalTraceCorrelation,
} from './src/types';
export { withEvaluatorSpan, withTaskSpan, getCurrentTraceId } from './src/utils/tracing';
export {
  containsAllTerms,
  extractAllStrings,
  extractMaxSemver,
  extractReleaseDateNearVersion,
  getBooleanMeta,
  getFinalAssistantMessage,
  getStringMeta,
  getToolCallSteps,
  includesOneOf,
} from './src/utils/evaluation_helpers';
export {
  type EvaluationReporter,
  createDefaultTerminalReporter,
} from './src/utils/reporting/evaluation_reporter';
export type {
  EvaluatorDisplayOptions,
  EvaluatorDisplayGroup,
} from './src/utils/reporting/report_table';
export {
  formatReportData,
  collectTraceLinkInfo,
  generateTraceUrl,
  generateLangSmithTraceUrl,
  generateLangSmithProjectUrl,
  getLangSmithConfig,
} from './src/utils/report_model_score';
export { createTable } from './src/utils/reporting/report_table';
export {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  type EvaluationExplanation,
  type EvaluatorStats,
  type RunStats,
  parseScoreDocuments,
} from './src/utils/score_repository';

export { getUniqueEvaluatorNames, calculateOverallStats } from './src/utils/evaluation_stats';

// Analysis service and types
export {
  EvaluationAnalysisService,
  type EvaluationAnalysisServiceConfig,
  type MetricComparison,
  type ComparisonSummary,
  type RunMetadata,
  type CompareRunsResult,
  type AnalyzeRunResult,
  type TrendAnalysisResult,
} from './src/utils/analysis';
export type {
  DatasetScore,
  DatasetScoreWithStats,
  EvaluatorStats,
} from './src/utils/evaluation_stats';
export { parseSelectedEvaluators, selectEvaluators } from './src/evaluators/filter';
export { createSpanLatencyEvaluator } from './src/evaluators/trace_based';
export { getGitMetadata, type GitMetadata } from './src/utils/git_metadata';

export {
  createPrecisionAtKEvaluator,
  createRecallAtKEvaluator,
  createF1AtKEvaluator,
  createRagEvaluators,
} from './src/evaluators/rag';
export type {
  GroundTruth,
  RagEvaluatorConfig,
  RetrievedDocsExtractor,
  GroundTruthExtractor,
  RetrievedDoc,
} from './src/evaluators/rag/types';

export {
  createToolSelectionEvaluator,
  createToolSelectionRecallEvaluator,
  createToolSelectionPrecisionEvaluator,
  createToolSelectionOrderEvaluator,
  createToolSelectionEvaluators,
  defaultExtractToolCalls,
  defaultExtractExpectedTools,
} from './src/evaluators/tool_selection';
export type {
  ToolCall,
  ExpectedToolSelection,
  ToolSelectionEvaluatorConfig,
} from './src/evaluators/tool_selection';

export {
  createSchemaComplianceEvaluator,
  createSchemaComplianceRateEvaluator,
  createParameterCompletenessEvaluator,
  createSchemaComplianceEvaluators,
  defaultExtractToolCalls as defaultExtractToolCallsWithArgs,
  defaultExtractExpectedSchemas,
} from './src/evaluators/schema_compliance';
export type {
  ToolCallWithArgs,
  ExpectedToolSchemas,
  SchemaComplianceEvaluatorConfig,
  JSONSchema,
  ToolParameterSchema,
  ValidationError,
} from './src/evaluators/schema_compliance';

// Trace preprocessing utilities
export {
  createTracePreprocessor,
  validateTraceId,
  formatTraceForPrompt,
  traceToSummarizeInput,
  filterTraceSpans,
  summarizeTraces,
  preprocessTraces,
} from './src/utils/improvement_suggestions/trace_preprocessor';
export type {
  RawSpanData,
  NormalizedSpan,
  TraceMetrics,
  PreprocessedTrace,
  TracePreprocessorConfig,
  FetchTraceOptions,
  PreprocessTracesOptions,
  PreprocessTracesResult,
} from './src/utils/improvement_suggestions/trace_preprocessor';

// Improvement analyzer
export {
  createImprovementAnalyzer,
  type ImprovementAnalyzerConfig,
  type AnalyzeExperimentInput,
  type ImprovementAnalyzer,
} from './src/utils/improvement_analyzer';

// Improvement suggestion prompts
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
  // Category guidance functions
  getPromptCategoryGuidance,
  getToolSelectionCategoryGuidance,
  getResponseQualityCategoryGuidance,
  getContextRetrievalCategoryGuidance,
  getReasoningCategoryGuidance,
  getAccuracyCategoryGuidance,
  getEfficiencyCategoryGuidance,
  getOtherCategoryGuidance,
  // Category utility functions
  CATEGORY_PROMPTS,
  getCategoryPrompt,
  getCategoryGuidance,
  getCategoryPromptsForCategories,
  getAllCategoryPrompts,
  getAvailableCategories,
} from './src/utils/improvement_suggestions/prompts';

// Improvement suggestion schemas (Zod schemas for validation)
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
} from './src/utils/improvement_suggestions/schemas';

// Improvement suggestions service factory
export {
  createImprovementSuggestionsService,
  type ImprovementSuggestionsServiceConfig,
  type ImprovementSuggestionsService,
} from './src/utils/improvement_suggestions';

// Token efficiency analyzer
export {
  createTokenEfficiencyAnalyzer,
  type TokenEfficiencyAnalyzer,
  type TokenEfficiencyAnalyzerConfig,
  type TokenEfficiencyResult,
  type AggregatedTokenEfficiencyResult,
} from './src/utils/improvement_suggestions';

// Trace analysis engine
export {
  createTraceAnalysisEngine,
  type TraceAnalysisEngine,
  type TraceAnalysisEngineConfig,
  type TraceAnalysisEngineResult,
  type BatchTraceAnalysisResult,
} from './src/utils/improvement_suggestions';

// Cross-trace pattern analyzer
export {
  createCrossTracePatternAnalyzer,
  type CrossTracePatternAnalyzer,
  type CrossTracePatternAnalyzerConfig,
} from './src/utils/improvement_suggestions';

// Suggestion aggregator
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
} from './src/utils/improvement_suggestions';

// Trace analysis schemas (Zod schemas for validation)
export {
  // Basic trace analysis schemas
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
  // Type exports
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
  type CrossTracePatternType,
  type CrossTracePattern,
  type TraceCluster,
  type TraceAnomaly,
  type CrossTraceCorrelation,
  type CrossTraceAnalysisResult,
} from './src/utils/improvement_suggestions';

// Eval thread ID utilities
export {
  generateEvalThreadId,
  isValidEvalThreadId,
  parseEvalThreadIdSeed,
  type GenerateEvalThreadIdOptions,
} from './src/utils/eval_thread_id';

// Result collection utilities
export {
  collectExperimentResults,
  filterResults,
  getResultsByExample,
  getResultsByRepetition,
  getScoresByEvaluator,
  getFailingResults,
  getPassingResults,
  createResultCollector,
  type CollectedResult,
  type EvaluatorSummary,
  type ExperimentResults,
  type ResultFilterOptions,
  type ResultCollector,
  type AggregatedSummary,
} from './src/utils/result_collector';

// Feedback loop orchestrator
export {
  createFeedbackLoopOrchestrator,
  type FeedbackLoopOrchestrator,
  type FeedbackLoopOrchestratorConfig,
  type FeedbackLoopInput,
  type FeedbackLoopIterationResult,
  type FeedbackLoopResult,
  type FeedbackLoopController,
} from './src/orchestrator';

// Eval runner step
export {
  createEvalRunnerStep,
  createBatchEvalRunnerStep,
  type EvalRunnerStep,
  type EvalRunnerStepConfig,
  type EvalRunnerStepInput,
  type EvalRunnerStepResult,
  type EvalRunnerStepStatus,
  type BatchEvalRunnerStep,
  type BatchEvalRunnerStepConfig,
  type BatchEvalRunnerStepResult,
} from './src/steps';

// Trace collector step
export {
  createTraceCollectorStep,
  createBatchTraceCollectorStep,
  type TraceCollectorStep,
  type TraceCollectorStepConfig,
  type TraceCollectorStepInput,
  type TraceCollectorStepResult,
  type TraceCollectorStepStatus,
  type TraceCollectorBackend,
  type BatchTraceCollectorStep,
  type BatchTraceCollectorStepConfig,
  type BatchTraceCollectorStepResult,
} from './src/steps';

// Analysis step
export {
  createAnalysisStep,
  createBatchAnalysisStep,
  type AnalysisStep,
  type AnalysisStepConfig,
  type AnalysisStepInput,
  type AnalysisStepResult,
  type AnalysisStepStatus,
  type AnalysisMethod,
  type BatchAnalysisStep,
  type BatchAnalysisStepConfig,
  type BatchAnalysisStepResult,
} from './src/steps';

// Subprocess runner for eval suites
export {
  runEvalSuiteSubprocess,
  runMultipleEvalSuites,
  createEvalSuiteSubprocessRunner,
  EvalSuiteSubprocessError,
  type RunEvalSuiteSubprocessConfig,
  type RunEvalSuiteSubprocessResult,
  type RunMultipleEvalSuitesConfig,
  type RunMultipleEvalSuitesResult,
  type EvalSuiteSubprocessRunner,
} from './src/steps';

// Eval trace correlation service
export {
  EvalTraceCorrelationService,
  createEvalTraceCorrelationService,
  type EvalTraceCorrelationServiceConfig,
  type CorrelateExperimentOptions,
  type CorrelateExperimentResult,
  type BatchCorrelateOptions,
  type BatchCorrelateResult,
} from './src/services';

// Failed evaluation traces utility
export {
  getFailedEvaluationTraces,
  getFailedEvaluationTraceIds,
  checkEvaluationFailure,
  groupFailedCorrelationsByEvaluator,
  groupFailedCorrelationsByCriterion,
  formatFailedEvaluationsSummary,
  type FailureDetectionCriteria,
  type GetFailedEvaluationTracesOptions,
  type FailureReason,
  type FailedEvaluationCorrelation,
  type GetFailedEvaluationTracesResult,
} from './src/utils/failed_evaluation_traces';

// Execution modes
export {
  createContinuousMode,
  createGitHookTriggerMode,
  touchTriggerFile,
  type ContinuousMode,
  type ContinuousModeConfig,
  type ContinuousModeController,
  type ContinuousModeStats,
  type ContinuousModeStatus,
  type FileChangeEvent,
  type FileChangeEventType,
  type OnFileChangeCallback,
} from './src/modes';

// Scheduled execution mode
export {
  createScheduledMode,
  isValidCronExpression,
  CronPresets,
  type ScheduledMode,
  type ScheduledModeConfig,
  type ScheduledModeController,
  type ScheduledModeStats,
  type ScheduledModeStatus,
  type ScheduledEvent,
  type OnScheduledCallback,
} from './src/modes';

// Mode factory for CLI-based mode selection
export {
  createModeFromCliArgs,
  parseModeCliArgs,
  validateModeCliArgs,
  isContinuousModeController,
  isScheduledModeController,
  getCronPreset,
  getModeCliHelp,
  type ModeType,
  type ModeController,
  type ModeCliArgs,
  type ModeFactoryConfig,
  type ModeFactoryResult,
} from './src/modes';

// Base analyzer interface and types
export type {
  // Core types
  AnalyzerCategory,
  AnalysisImpact,
  AnalysisConfidence,
  AnalyzerMethod,
  // Evidence and findings
  AnalysisEvidence,
  AnalysisFinding,
  AnalysisFindingSummary,
  // Results and metadata
  BaseAnalysisResult,
  AnalysisMetadata,
  // Input types
  BaseAnalysisInput,
  TraceAwareAnalysisInput,
  // Configuration
  BaseAnalyzerConfig,
  // Analyzer interfaces
  Analyzer,
  BatchAnalyzer,
  ComparativeAnalyzer,
  FullAnalyzer,
  // Factory and registry
  AnalyzerFactory,
  AnalyzerRegistryEntry,
  // Helper types
  AnalyzerInput,
  AnalyzerResult,
  AnalyzerConfig,
} from './src/analyzers';

// Tool selection analyzer
export { createToolSelectionAnalyzer } from './src/analyzers';
export type {
  ToolSelectionAnalyzer,
  ToolSelectionAnalyzerConfig,
  ToolSelectionAnalysisInput,
  ToolSelectionAnalysisResult,
  ToolSelectionFinding,
  ToolSelectionAggregateMetrics,
  ToolSelectionIssueType,
} from './src/analyzers';

// CLI flags and utilities
export {
  EVALS_CLI_FLAG_OPTIONS,
  VALID_MODES,
  VALID_OUTPUT_FORMATS,
  parseMode,
  parseOutputFormat,
  parseEvalsCliFlags,
  isValidMode,
  isValidOutputFormat,
  type EvalsCliArgs,
  type OutputFormat,
} from './src/cli';

// Re-export Scout tags here to avoid requiring a direct dependency on @kbn/scout for modules using @kbn/evals
export { tags } from '@kbn/scout';
