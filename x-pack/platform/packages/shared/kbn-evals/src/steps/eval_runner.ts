/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import { KibanaEvalsClient } from '../kibana_evals_executor/client';
import type {
  EvaluationDataset,
  Evaluator,
  Example,
  ExperimentTask,
  EvalsExecutorClient,
  RanExperiment,
  TaskOutput,
} from '../types';

/**
 * Status of an eval runner step execution.
 */
export type EvalRunnerStepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Configuration for creating an EvalRunnerStep.
 */
export interface EvalRunnerStepConfig {
  /** Logger instance */
  log: SomeDevLog;
  /** Model being evaluated */
  model: Model;
  /** Unique run identifier */
  runId: string;
  /** Number of repetitions per example (default: 1) */
  repetitions?: number;
  /** Concurrency for running experiments (default: 1) */
  concurrency?: number;
  /** Optional pre-configured executor client (defaults to KibanaEvalsClient) */
  executorClient?: EvalsExecutorClient;
  /** Callback invoked when the step starts */
  onStart?: () => void;
  /** Callback invoked when the step completes */
  onComplete?: (result: EvalRunnerStepResult) => void;
  /** Callback invoked when an experiment completes */
  onExperimentComplete?: (experiment: RanExperiment) => void;
  /** Callback invoked on error */
  onError?: (error: Error) => void;
}

/**
 * Input for executing the eval runner step.
 */
export interface EvalRunnerStepInput<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** The dataset to evaluate */
  dataset: EvaluationDataset<TExample>;
  /** The task function to evaluate */
  task: ExperimentTask<TExample, TTaskOutput>;
  /** Evaluators to use */
  evaluators: Array<Evaluator<TExample, TTaskOutput>>;
  /** Optional metadata for the experiment */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a single eval runner step execution.
 */
export interface EvalRunnerStepResult {
  /** Execution status */
  status: EvalRunnerStepStatus;
  /** The ran experiment with evaluation results */
  experiment?: RanExperiment;
  /** Mean score across all evaluators */
  meanScore?: number;
  /** Error if the step failed */
  error?: Error;
  /** Timestamp when the step started */
  startedAt: string;
  /** Timestamp when the step completed */
  completedAt?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * EvalRunnerStep wraps Playwright test execution with KibanaEvalsClient.
 *
 * This step provides a unified interface for running evaluation experiments
 * as part of a pipeline, handling:
 * - Experiment execution with the configured executor client
 * - Score calculation and aggregation
 * - Progress callbacks for monitoring
 * - Error handling and status reporting
 *
 * @example
 * ```typescript
 * const step = createEvalRunnerStep({
 *   log,
 *   model: { family: 'openai', provider: 'azure', id: 'gpt-4' },
 *   runId: 'test-run-001',
 *   repetitions: 3,
 * });
 *
 * const result = await step.execute({
 *   dataset: myDataset,
 *   task: async (example) => await runMyTask(example),
 *   evaluators: [myEvaluator],
 * });
 *
 * console.log(`Mean score: ${result.meanScore}`);
 * ```
 */
export interface EvalRunnerStep {
  /** Execute the eval runner step */
  execute: <TExample extends Example, TTaskOutput extends TaskOutput>(
    input: EvalRunnerStepInput<TExample, TTaskOutput>
  ) => Promise<EvalRunnerStepResult>;
  /** Get the executor client instance */
  getExecutorClient: () => EvalsExecutorClient;
  /** Get all experiments that have been run */
  getRanExperiments: () => Promise<RanExperiment[]>;
}

/**
 * Calculates the mean score from an experiment's evaluation runs.
 */
function calculateMeanScore(experiment: RanExperiment): number {
  const { evaluationRuns } = experiment;

  if (!evaluationRuns || evaluationRuns.length === 0) {
    return 0;
  }

  const scores = evaluationRuns
    .map((evalRun) => evalRun.result?.score)
    .filter((score): score is number => typeof score === 'number' && !Number.isNaN(score));

  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Creates an EvalRunnerStep instance that wraps Playwright test execution
 * with KibanaEvalsClient.
 *
 * @param config - Configuration for the eval runner step
 * @returns EvalRunnerStep instance
 */
export function createEvalRunnerStep(config: EvalRunnerStepConfig): EvalRunnerStep {
  const {
    log,
    model,
    runId,
    repetitions = 1,
    concurrency = 1,
    onStart,
    onComplete,
    onExperimentComplete,
    onError,
  } = config;

  // Create or use provided executor client
  const executorClient =
    config.executorClient ??
    new KibanaEvalsClient({
      log,
      model,
      runId,
      repetitions,
    });

  /**
   * Execute the eval runner step.
   */
  async function execute<TExample extends Example, TTaskOutput extends TaskOutput>(
    input: EvalRunnerStepInput<TExample, TTaskOutput>
  ): Promise<EvalRunnerStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    if (onStart) {
      onStart();
    }

    log.info(
      `🚀 Starting eval runner step for dataset "${input.dataset.name}" with ${input.evaluators.length} evaluators`
    );

    try {
      const experiment = await executorClient.runExperiment(
        {
          dataset: input.dataset,
          task: input.task,
          metadata: {
            ...input.metadata,
            runId,
            model,
          },
          concurrency,
        },
        input.evaluators
      );

      const meanScore = calculateMeanScore(experiment);

      log.info(
        `✅ Eval runner step completed for dataset "${
          input.dataset.name
        }" with mean score: ${meanScore.toFixed(3)}`
      );

      if (onExperimentComplete) {
        onExperimentComplete(experiment);
      }

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const result: EvalRunnerStepResult = {
        status: 'completed',
        experiment,
        meanScore,
        startedAt,
        completedAt,
        durationMs,
      };

      if (onComplete) {
        onComplete(result);
      }

      return result;
    } catch (error) {
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      log.error(`❌ Eval runner step failed for dataset "${input.dataset.name}": ${err.message}`);

      if (onError) {
        onError(err);
      }

      const result: EvalRunnerStepResult = {
        status: 'failed',
        error: err,
        startedAt,
        completedAt,
        durationMs,
      };

      if (onComplete) {
        onComplete(result);
      }

      return result;
    }
  }

  return {
    execute,
    getExecutorClient: () => executorClient,
    getRanExperiments: () => executorClient.getRanExperiments(),
  };
}

/**
 * Type for batch eval runner that can execute multiple experiments sequentially or in parallel.
 */
export interface BatchEvalRunnerStepConfig extends EvalRunnerStepConfig {
  /** Whether to run experiments in parallel (default: false - sequential) */
  parallel?: boolean;
  /** Maximum parallel experiments when parallel is true (default: 3) */
  maxParallel?: number;
}

/**
 * Result from a batch eval runner execution.
 */
export interface BatchEvalRunnerStepResult {
  /** Overall status */
  status: EvalRunnerStepStatus;
  /** Results for each experiment */
  results: EvalRunnerStepResult[];
  /** Aggregated mean score across all experiments */
  aggregateMeanScore?: number;
  /** Number of successful experiments */
  successCount: number;
  /** Number of failed experiments */
  failureCount: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Timestamp when the batch started */
  startedAt: string;
  /** Timestamp when the batch completed */
  completedAt: string;
}

/**
 * Creates a batch eval runner that can execute multiple experiments.
 *
 * @param config - Configuration for the batch eval runner
 * @returns Batch execution function
 */
export function createBatchEvalRunnerStep(config: BatchEvalRunnerStepConfig) {
  const { parallel = false, maxParallel = 3, log, ...stepConfig } = config;

  const step = createEvalRunnerStep({ log, ...stepConfig });

  /**
   * Execute multiple experiments in batch.
   */
  async function executeBatch<TExample extends Example, TTaskOutput extends TaskOutput>(
    inputs: Array<EvalRunnerStepInput<TExample, TTaskOutput>>
  ): Promise<BatchEvalRunnerStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const results: EvalRunnerStepResult[] = [];

    log.info(
      `🚀 Starting batch eval runner with ${inputs.length} experiments (parallel: ${parallel})`
    );

    if (parallel) {
      // Execute in parallel with concurrency limit
      const pLimit = (await import('p-limit')).default;
      const limiter = pLimit(maxParallel);

      const promises = inputs.map((input, index) =>
        limiter(async () => {
          log.info(`📊 Running experiment ${index + 1}/${inputs.length}: "${input.dataset.name}"`);
          return step.execute(input);
        })
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } else {
      // Execute sequentially
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        log.info(`📊 Running experiment ${i + 1}/${inputs.length}: "${input.dataset.name}"`);
        const result = await step.execute(input);
        results.push(result);
      }
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;

    const successCount = results.filter((r) => r.status === 'completed').length;
    const failureCount = results.filter((r) => r.status === 'failed').length;

    // Calculate aggregate mean score from successful experiments
    const successfulScores = results
      .filter((r) => r.status === 'completed' && typeof r.meanScore === 'number')
      .map((r) => r.meanScore!);

    const aggregateMeanScore =
      successfulScores.length > 0
        ? successfulScores.reduce((sum, score) => sum + score, 0) / successfulScores.length
        : undefined;

    const overallStatus: EvalRunnerStepStatus =
      failureCount === 0 ? 'completed' : successCount > 0 ? 'completed' : 'failed';

    log.info(
      `✅ Batch eval runner completed: ${successCount}/${
        inputs.length
      } succeeded, aggregate mean score: ${aggregateMeanScore?.toFixed(3) ?? 'N/A'}`
    );

    return {
      status: overallStatus,
      results,
      aggregateMeanScore,
      successCount,
      failureCount,
      totalDurationMs,
      startedAt,
      completedAt,
    };
  }

  return {
    executeBatch,
    getStep: () => step,
    getExecutorClient: () => step.getExecutorClient(),
    getRanExperiments: () => step.getRanExperiments(),
  };
}

/**
 * Type for the batch eval runner step instance.
 */
export type BatchEvalRunnerStep = ReturnType<typeof createBatchEvalRunnerStep>;
