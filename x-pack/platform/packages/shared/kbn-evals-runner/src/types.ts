/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  /**
   * Stable identifier for this example, typically a content hash.
   * Optional because inline datasets may not have persisted IDs.
   */
  id?: string;
  input?: TInput;
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

export type ExperimentTask<TExample extends Example, TTaskOutput extends TaskOutput> = (
  example: TExample
) => Promise<TTaskOutput>;

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
  runs: Record<string, TaskRun>;
  evaluationRuns: EvaluationRun[];
  experimentMetadata?: Record<string, unknown>;
}

/**
 * Emitted by the executor client after each evaluator completes for a single
 * example+repetition. Consumers (e.g. the Playwright fixture) can use this to
 * incrementally export score documents to Elasticsearch so that results survive
 * worker crashes.
 */
export interface EvaluationCompleteEvent {
  experimentId: string;
  datasetId: string;
  datasetName: string;
  taskRun: TaskRun;
  evaluationRun: EvaluationRun;
  exampleId: string;
}

export type OnEvaluationComplete = (event: EvaluationCompleteEvent) => Promise<void>;
