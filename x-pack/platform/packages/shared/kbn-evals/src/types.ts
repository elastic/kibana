/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, Model } from '@kbn/inference-common';
import type { HttpHandler } from '@kbn/core/public';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { EsClient, ScoutWorkerFixtures } from '@kbn/scout';
import type { EvaluationCriterion } from './evaluators/criteria';
import { type EvaluationReporter } from './utils/reporting/evaluation_reporter';
import type {
  EvaluatorDisplayOptions,
  EvaluatorDisplayGroup,
} from './utils/reporting/report_table';
import type { DatasetScoreWithStats } from './utils/evaluation_stats';
import type { PreprocessedTrace } from './utils/improvement_suggestions/trace_preprocessor';
import type { EvaluatorStats } from './utils/score_repository';

export interface EvaluationDataset<TExample extends Example = Example> {
  name: string;
  description: string;
  examples: TExample[];
  id?: undefined;
}

export interface EvaluationDatasetWithId<TExample extends Example = Example>
  extends Omit<EvaluationDataset<TExample>, 'id'> {
  id: string;
}

export type TaskOutput = unknown;

export interface Example<
  TInput extends Record<string, unknown> = Record<string, unknown>,
  TExpected = any,
  TMetadata extends Record<string, unknown> | null = Record<string, unknown> | null
> {
  input: TInput;
  /**
   * Expected output/ground truth for the example.
   *
   * Note: kept intentionally loose to stay compatible with existing datasets and
   * the Phoenix-backed executor types.
   */
  output?: TExpected;
  /**
   * Phoenix may return `null` metadata in stored examples.
   */
  metadata?: TMetadata;
}

export interface EvaluatorParams<TExample extends Example, TTaskOutput extends TaskOutput> {
  input: TExample['input'];
  output: TTaskOutput;
  expected: TExample['output'];
  metadata: TExample['metadata'];
}

/**
 * Evaluation output returned by evaluators.
 *
 * This shape is intentionally compatible with the existing evaluator implementations and
 * the Phoenix client types:
 * - `score` may be omitted or `null` for "unavailable"/"error" cases
 * - `label`/`explanation` are used widely in tests and reporting
 */
export interface EvaluationResult {
  score?: number | null;
  label?: string | null;
  explanation?: string | null;
  reasoning?: string;
  details?: unknown;
  metadata?: Record<string, unknown> | undefined;
}

type EvaluatorCallback<TExample extends Example, TTaskOutput extends TaskOutput> = (
  params: EvaluatorParams<TExample, TTaskOutput>
) => Promise<EvaluationResult>;

export interface Evaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  name: string;
  kind: 'LLM' | 'CODE';
  evaluate: EvaluatorCallback<TExample, TTaskOutput>;
}
export interface DefaultEvaluators {
  criteria: (criteria: EvaluationCriterion[]) => Evaluator;
  correctnessAnalysis: () => Evaluator;
  groundednessAnalysis: () => Evaluator;
  traceBasedEvaluators: {
    inputTokens: Evaluator;
    outputTokens: Evaluator;
    latency: Evaluator;
    toolCalls: Evaluator;
    cachedTokens: Evaluator;
  };
}

export type ExperimentTask<TExample extends Example, TTaskOutput extends TaskOutput> = (
  example: TExample
) => Promise<TTaskOutput>;

/**
 * Shared executor interface implemented by both the in-Kibana and Phoenix-backed executors.
 *
 * Note: the eval suites should depend on this interface (or structural typing), not Phoenix-specific types.
 */
export interface EvalsExecutorClient {
  runExperiment<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    options: {
      dataset: TEvaluationDataset;
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency?: number;
      /**
       * Phoenix-only: when true, the executor may trust that the dataset already exists upstream
       * and should be resolved/loaded externally (e.g. by name) rather than created from the
       * provided examples.
       *
       * The in-Kibana executor ignores this option.
       */
      trustUpstreamDataset?: boolean;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment>;

  getRanExperiments(): Promise<RanExperiment[]>;
}

export interface ExampleWithId extends Example {
  id: string;
}

export interface TaskRun {
  exampleIndex: number;
  repetition: number;
  input: Example['input'];
  expected: Example['output'];
  metadata: Example['metadata'];
  output: TaskOutput;
  traceId?: string | null;
}

export interface EvaluationRun {
  name: string;
  result?: EvaluationResult;
  experimentRunId: string;
  traceId?: string | null;
  exampleId?: string;
}

export interface RanExperiment {
  id: string;
  datasetId: string;
  datasetName: string;
  datasetDescription?: string;
  runs: Record<string, TaskRun & { evalThreadId?: string }>;
  evaluationRuns: Array<
    EvaluationRun & {
      /**
       * Optional linkage back to the originating run.
       *
       * - Always populated by the in-Kibana executor.
       * - May be missing when using the Phoenix-backed executor (depends on Phoenix payload shape).
       */
      runKey?: string;
      exampleIndex?: number;
      repetition?: number;
    }
  >;
  experimentMetadata?: Record<string, unknown>;
}

export interface ReportDisplayOptions {
  /**
   * Display options for individual evaluators, keyed by evaluator name.
   * Controls decimal places, units, and which statistics to show.
   */
  evaluatorDisplayOptions: Map<string, EvaluatorDisplayOptions>;

  /**
   * Grouping configuration for combining multiple evaluators into a single column.
   * For example, grouping Input/Output/Cached tokens into a "Tokens" column.
   */
  evaluatorDisplayGroups: EvaluatorDisplayGroup[];
}
/**
 * Information about trace links for an evaluation run.
 */
export interface TraceLinkInfo {
  /**
   * Trace IDs collected from the evaluation runs, keyed by dataset name.
   * Each dataset maps to an array of trace IDs (one per run/example).
   */
  traceIdsByDataset: Map<string, string[]>;
  /**
   * Total count of trace IDs collected across all datasets.
   */
  totalTraceCount: number;
  /**
   * Base URL for viewing traces (e.g., Phoenix UI or APM).
   * When provided, can be used to construct full trace URLs.
   */
  traceBaseUrl?: string;
  /**
   * Project ID for trace viewing (used by Phoenix/Langfuse).
   */
  projectId?: string;
  /**
   * LangSmith configuration for trace viewing.
   * When provided, generates LangSmith-specific trace URLs.
   */
  langsmith?: {
    /**
     * LangSmith base URL (defaults to 'https://smith.langchain.com').
     */
    baseUrl?: string;
    /**
     * LangSmith organization ID.
     */
    orgId?: string;
    /**
     * LangSmith project ID.
     */
    projectId?: string;
  };
}

export interface EvaluationReport {
  stats: EvaluatorStats[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId: string;
  /**
   * Optional trace link information for debugging and trace exploration.
   */
  traceLinkInfo?: TraceLinkInfo;
}

export interface EvaluationSpecificWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  /**
   * Executor client used to run experiments (defaults to in-Kibana; Phoenix-backed via `KBN_EVALS_EXECUTOR=phoenix`).
   */
  executorClient: EvalsExecutorClient;
  /**
   * @deprecated Use `executorClient`. Kept for backwards compatibility while suites migrate off Phoenix naming.
   */
  phoenixClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  reportDisplayOptions: ReportDisplayOptions;
  reportModelScore: EvaluationReporter;
  traceEsClient: EsClient;
}

export interface EvaluationWorkerFixtures extends ScoutWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  /**
   * Executor client used to run experiments (defaults to in-Kibana; Phoenix-backed via `KBN_EVALS_EXECUTOR=phoenix`).
   */
  executorClient: EvalsExecutorClient;
  /**
   * @deprecated Use `executorClient`. Kept for backwards compatibility while suites migrate off Phoenix naming.
   */
  phoenixClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
}

/**
 * Category of improvement suggestion indicating the area of the system that can be improved.
 */
export type ImprovementSuggestionCategory =
  | 'prompt'
  | 'tool_selection'
  | 'response_quality'
  | 'context_retrieval'
  | 'reasoning'
  | 'accuracy'
  | 'efficiency'
  | 'other';

/**
 * Impact level indicating the potential benefit of implementing the suggestion.
 */
export type ImprovementSuggestionImpact = 'high' | 'medium' | 'low';

/**
 * Confidence level indicating how certain the analysis is about this suggestion.
 */
export type ImprovementSuggestionConfidence = 'high' | 'medium' | 'low';

/**
 * Evidence supporting an improvement suggestion, linking back to specific evaluation results.
 */
export interface ImprovementSuggestionEvidence {
  /**
   * Name of the evaluator that identified the issue.
   */
  evaluatorName: string;
  /**
   * Indices of examples that exhibited the issue.
   */
  exampleIndices: number[];
  /**
   * Relevant score or metric value.
   */
  score?: number;
  /**
   * Explanation from the evaluator about the issue.
   */
  explanation?: string;
  /**
   * Additional context or details about the evidence.
   */
  details?: Record<string, unknown>;
}

/**
 * A single improvement suggestion derived from evaluation results.
 */
export interface ImprovementSuggestion {
  /**
   * Unique identifier for the suggestion.
   */
  id: string;
  /**
   * Short descriptive title of the suggestion.
   */
  title: string;
  /**
   * Detailed description of the issue and proposed improvement.
   */
  description: string;
  /**
   * Category of the improvement.
   */
  category: ImprovementSuggestionCategory;
  /**
   * Estimated impact if the suggestion is implemented.
   */
  impact: ImprovementSuggestionImpact;
  /**
   * Confidence level in this suggestion.
   */
  confidence: ImprovementSuggestionConfidence;
  /**
   * Evidence from evaluations supporting this suggestion.
   */
  evidence: ImprovementSuggestionEvidence[];
  /**
   * Concrete action items to implement the improvement.
   */
  actionItems?: string[];
  /**
   * Optional priority score for ranking suggestions (0-1 scale).
   */
  priorityScore?: number;
  /**
   * Tags for filtering and categorization.
   */
  tags?: string[];
}

/**
 * Summary statistics for a collection of improvement suggestions.
 */
export interface ImprovementSuggestionSummary {
  /**
   * Total number of suggestions.
   */
  totalSuggestions: number;
  /**
   * Breakdown by impact level.
   */
  byImpact: Record<ImprovementSuggestionImpact, number>;
  /**
   * Breakdown by category.
   */
  byCategory: Record<ImprovementSuggestionCategory, number>;
  /**
   * Top priority suggestions (sorted by priorityScore).
   */
  topPriority: ImprovementSuggestion[];
}

/**
 * Result of analyzing evaluation results to generate improvement suggestions.
 */
export interface ImprovementSuggestionAnalysisResult {
  /**
   * List of improvement suggestions.
   */
  suggestions: ImprovementSuggestion[];
  /**
   * Summary statistics.
   */
  summary: ImprovementSuggestionSummary;
  /**
   * Metadata about the analysis.
   */
  metadata: {
    /**
     * ID of the evaluation run that was analyzed.
     */
    runId: string;
    /**
     * Dataset name that was analyzed.
     */
    datasetName: string;
    /**
     * Model used in the evaluation.
     */
    model?: string;
    /**
     * Timestamp when the analysis was performed.
     */
    analyzedAt: string;
    /**
     * Model used to generate the suggestions (if LLM-based).
     */
    analyzerModel?: string;
  };
}

/**
 * Correlates an evaluation run with its corresponding trace data.
 *
 * This type links evaluation results back to the underlying trace telemetry,
 * enabling trace-based analysis and debugging of evaluation outcomes.
 */
export interface EvalTraceCorrelation {
  /**
   * The trace ID associated with this evaluation run.
   */
  traceId: string;
  /**
   * Index of the example in the dataset (0-based).
   */
  exampleIndex: number;
  /**
   * Repetition number for this example (when running multiple repetitions).
   */
  repetition: number;
  /**
   * Key identifying the specific run in the experiment.
   */
  runKey: string;
  /**
   * The input provided to the task for this evaluation.
   */
  input: Example['input'];
  /**
   * The expected output/ground truth for validation.
   */
  expected?: Example['output'];
  /**
   * The actual output produced by the task.
   */
  output: TaskOutput;
  /**
   * Evaluation results for this run, keyed by evaluator name.
   */
  evaluationResults: Record<string, EvaluationResult>;
  /**
   * Preprocessed trace data when available.
   * May be undefined if trace fetching was deferred or failed.
   */
  trace?: PreprocessedTrace;
  /**
   * Error message if trace fetching failed.
   */
  traceError?: string;
}
