/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type {
  EvaluationResult as PhoenixEvaluationResult,
  Evaluator as PhoenixEvaluator,
  TaskOutput,
} from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { BoundInferenceClient, Model } from '@kbn/inference-common';
import type { HttpHandler } from '@kbn/core/public';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { ScoutWorkerFixtures } from '@kbn/scout';
import type { KibanaPhoenixClient } from './kibana_phoenix_client/client';
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

export interface EvaluatorParams<TExample extends Example, TTaskOutput extends TaskOutput> {
  input: TExample['input'];
  output: TTaskOutput;
  expected: TExample['output'];
  metadata: TExample['metadata'];
}

export type EvaluationResult = PhoenixEvaluationResult;

type EvaluatorCallback<TExample extends Example, TTaskOutput extends TaskOutput> = (
  params: EvaluatorParams<TExample, TTaskOutput>
) => Promise<EvaluationResult>;

export interface Evaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> extends Omit<PhoenixEvaluator, 'evaluate'> {
  evaluate: EvaluatorCallback<TExample, TTaskOutput>;
}
export interface DefaultEvaluators {
  criteria: (criteria: EvaluationCriterion[]) => Evaluator;
  correctnessAnalysis: () => Evaluator;
  groundednessAnalysis: () => Evaluator;
  traceBasedEvaluators: () => Evaluator[];
}

export type ExperimentTask<TExample extends Example, TTaskOutput extends TaskOutput> = (
  example: TExample
) => Promise<TTaskOutput>;

// simple version of Phoenix's ExampleWithId
export type ExampleWithId = Example & { id: string };

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
  phoenixClient: KibanaPhoenixClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  evaluationAnalysisService: EvaluationAnalysisService;
  reportDisplayOptions: ReportDisplayOptions;
  reportModelScore: EvaluationReporter;
}

export interface EvaluationWorkerFixtures extends ScoutWorkerFixtures {
  inferenceClient: BoundInferenceClient;
  phoenixClient: KibanaPhoenixClient;
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  evaluationAnalysisService: EvaluationAnalysisService;
}
