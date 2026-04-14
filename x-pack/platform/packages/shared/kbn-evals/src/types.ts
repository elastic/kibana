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
import type { Evaluator, EvalsExecutorClient } from '@kbn/evals-runner';
import type { EvaluationCriterion } from './evaluators/criteria';
import type { EvaluationReporter } from './utils/reporting/evaluation_reporter';
import type {
  EvaluatorDisplayOptions,
  EvaluatorDisplayGroup,
} from './utils/reporting/report_table';
import type { EvaluatorStats } from './utils/score_repository';

/**
 * Core evaluation contracts are runtime-safe and shared with online evals.
 *
 * Note: these types are intended to stay compatible with the trace-first evaluator contract:
 * evaluators produce standardized score/label/explanation outputs, and metadata can carry
 * trace pointers and evaluator-specific details for explainability.
 */
export type {
  EvaluationDataset,
  EvaluationDatasetWithId,
  Example,
  ExampleWithId,
  TaskOutput,
  EvaluatorParams,
  EvaluationResult,
  Evaluator,
  ExperimentTask,
  EvalsExecutorClient,
  RanExperiment,
  TaskRun,
  EvaluationRun,
  EvaluationCompleteEvent,
  OnEvaluationComplete,
} from '@kbn/evals-runner';

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
  stats: EvaluatorStats[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId: string;
}

export interface EvaluationSpecificWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  evaluationsKbnClient: ScoutWorkerFixtures['kbnClient'];
  /**
   * Whether the target Kibana has the evals plugin enabled (xpack.evals.enabled: true).
   * Determined once per worker by probing the plugin's enabled endpoint.
   */
  evaluationsPluginEnabled: boolean;
  /**
   * Executor client used to run experiments.
   */
  executorClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  reportDisplayOptions: ReportDisplayOptions;
  reportModelScore: EvaluationReporter;
  traceEsClient: EsClient;
  evaluationsEsClient: EsClient;
}

export interface EvaluationWorkerFixtures extends ScoutWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  /**
   * Executor client used to run experiments.
   */
  executorClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
}
