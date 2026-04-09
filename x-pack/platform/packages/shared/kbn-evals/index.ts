/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @kbn/evals — Evaluation framework for LLM-based workflows in Kibana.
 *
 * This package provides the shared evaluation layer (vision Section 5.2.3): evaluator
 * factories, data model types, persistence utilities, and reporting primitives. It is
 * designed to be independent of how evaluations are triggered (CI/offline vs in-tool).
 *
 * ## Architecture boundaries
 * - **Framework primitives** (this package): evaluator contracts, trace-based evaluators,
 *   data model, persistence, reporting, CLI tooling
 * - **Solution suites** (separate packages): datasets, tasks, solution-specific evaluators,
 *   solution-specific reporting
 *
 * @module @kbn/evals
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
export { KibanaEvalsClient } from './src/kibana_evals_executor/client';
export { createQuantitativeCorrectnessEvaluators } from './src/evaluators/correctness';
export { LlmCorrectnessEvaluationPrompt } from './src/evaluators/correctness/prompt';
export type { CorrectnessAnalysis } from './src/evaluators/correctness/types';
export {
  calculateFactualScore,
  calculateRelevanceScore,
} from './src/evaluators/correctness/scoring';
export { createQuantitativeGroundednessEvaluator } from './src/evaluators/groundedness';
export type { EvaluationDataset, EvaluationWorkerFixtures, EvaluationReport } from './src/types';
export { withEvaluatorSpan, withTaskSpan, getCurrentTraceId } from './src/utils/tracing';
export { withRetry, type RetryOptions } from './src/utils/retry_utils';
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
export { createTable } from './src/utils/reporting/report_table';
export {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  type EvaluatorStats,
  type RunStats,
} from './src/utils/score_repository';
export { mapToEvaluationScoreDocuments, exportEvaluations } from './src/utils/report_model_score';

export { parseSelectedEvaluators, selectEvaluators } from './src/evaluators/filter';
/**
 * Trace-based evaluators — the preferred pattern for non-functional metrics.
 *
 * These evaluators query OTel traces in Elasticsearch via ES|QL, extracting latency,
 * token usage, tool calls, and skill invocations directly from production-grade traces.
 * This is the trace-first evaluator pattern described in vision Section 5.2.1.
 *
 * New evaluators that measure non-functional signals should use `createTraceBasedEvaluator`
 * rather than implementing custom ES queries.
 */
export {
  createTraceBasedEvaluator,
  type TraceBasedEvaluatorConfig,
  createSpanLatencyEvaluator,
  createSkillInvocationEvaluator,
  createToolCallsEvaluator,
} from './src/evaluators/trace_based';
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
export { createEsqlEquivalenceEvaluator } from './src/evaluators/esql';

export { createTrajectoryEvaluator } from './src/evaluators/trajectory';
export { createConversationCoherenceEvaluator } from './src/evaluators/conversation_coherence';
export { createMultiJudgeEvaluator } from './src/evaluators/multi_judge';
export {
  createToolPoisoningEvaluator,
  createPromptLeakDetectionEvaluator,
  createScopeViolationEvaluator,
} from './src/evaluators/security';
export { createSimilarityEvaluator } from './src/evaluators/similarity';

// Re-export Scout tags here to avoid requiring a direct dependency on @kbn/scout for modules using @kbn/evals
export { tags } from '@kbn/scout';
