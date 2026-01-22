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
import type { EvaluationAnalysisService } from './utils/analysis';
import { type EvaluationReporter } from './utils/reporting/evaluation_reporter';
import type {
  EvaluatorDisplayOptions,
  EvaluatorDisplayGroup,
} from './utils/reporting/report_table';
import type { DatasetScoreWithStats } from './utils/evaluation_stats';

export interface EvaluationDataset {
  name: string;
  description: string;
  examples: Example[];
  id?: undefined;
}

export interface EvaluationDatasetWithId extends Omit<EvaluationDataset, 'id'> {
  id: string;
}

export type TaskOutput = unknown;

export interface Example {
  input: Record<string, unknown>;
  /**
   * Expected output/ground truth for the example.
   *
   * Note: kept intentionally loose to stay compatible with existing datasets and
   * the Phoenix-backed executor types.
   */
  output?: any;
  /**
   * Phoenix may return `null` metadata in stored examples.
   */
  metadata?: Record<string, unknown> | null;
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
  explanation?: string;
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
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment>;

  getRanExperiments(): Promise<RanExperiment[]>;
}

export interface ExampleWithId extends Example {
  id: string;
}

export interface RanExperiment {
  id: string;
  datasetId: string;
  datasetName: string;
  datasetDescription?: string;
  runs: Record<
    string,
    {
      exampleIndex: number;
      repetition: number;
      input: Example['input'];
      expected: Example['output'];
      metadata: Example['metadata'];
      output: TaskOutput;
    }
  >;
  evaluationRuns: Array<{
    name: string;
    result?: EvaluationResult;
  }>;
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
export interface EvaluationReport {
  datasetScoresWithStats: DatasetScoreWithStats[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId: string;
}

export interface EvaluationSpecificWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  phoenixClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  evaluationAnalysisService: EvaluationAnalysisService;
  reportDisplayOptions: ReportDisplayOptions;
  reportModelScore: EvaluationReporter;
  traceEsClient: EsClient;
}

export interface EvaluationWorkerFixtures extends ScoutWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  phoenixClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  evaluationAnalysisService: EvaluationAnalysisService;
}
