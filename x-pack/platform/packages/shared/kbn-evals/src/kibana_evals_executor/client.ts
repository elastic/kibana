/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { v5 as uuidv5 } from 'uuid';
import { randomUUID } from 'crypto';
import { withInferenceContext } from '@kbn/inference-tracing';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import { DEFAULT_SPACE_ID, getDatasetId } from '@kbn/evals-common';
import type {
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  EvaluationDatasetWithId,
  EvaluationResult,
  ExperimentTask,
  OnEvaluationComplete,
  OnExperimentStart,
  DatasetRunResult,
  TaskOutput,
} from '../types';
import { getCurrentTraceId, withEvaluatorSpan, withTaskSpan } from '../utils/tracing';
import { DEFAULT_EXPERIMENT_CONCURRENCY } from '../utils/concurrency';

// The ingest API caps `evaluator.explanation` at 4096 characters; a longer one rejects the score.
const MAX_ERROR_MESSAGE_LENGTH = 1000;

const toErrorMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_MESSAGE_LENGTH);

/** A null score means "could not score"; 0 is reserved for output that was scored and wrong. */
const toErrorResult = (message: string): EvaluationResult => ({
  score: null,
  label: 'error',
  explanation: message,
});

/**
 * Reads an evaluator's optional metadata getter. Attribution is best-effort: a getter that
 * throws must not reject the experiment or turn a finished score into an error.
 */
const readEvaluatorAttribute = <T>(getter: (() => T) | undefined): T | undefined => {
  try {
    return getter?.();
  } catch {
    return undefined;
  }
};

const EXPERIMENT_UUID_NAMESPACE = 'c7e6c018-66dc-4511-b97d-046e2194d017';

function computeExperimentId(
  executionId: string | undefined,
  experimentName: string,
  modelId: string | undefined
): string {
  if (!executionId) {
    return randomUUID();
  }
  return uuidv5(
    `${executionId}::${experimentName}::${modelId ?? 'unknown'}`,
    EXPERIMENT_UUID_NAMESPACE
  );
}

export class KibanaEvalsClient implements EvalsExecutorClient {
  private readonly datasetRunResults: DatasetRunResult[] = [];

  constructor(
    private readonly options: {
      log: SomeDevLog;
      model: Model;
      executionId?: string;
      repetitions?: number;
      /** Examples each experiment runs at once when the spec doesn't pass its own. */
      concurrency?: number;
      /** What `--concurrency` / `EVAL_CONCURRENCY` asked for, so overriding it can be reported. */
      requestedConcurrency?: number;
      /**
       * Persists the dataset and resolves to the id the server stored it under,
       * which scores are stamped with. An id it didn't return would detach them.
       */
      upsertDataset?: (dataset: EvaluationDataset) => Promise<string>;
      getDatasetByName?: (
        datasetName: string
      ) => Promise<EvaluationDataset | EvaluationDatasetWithId | null>;
      onEvaluationComplete?: OnEvaluationComplete;
      onExperimentStart?: OnExperimentStart;
    }
  ) {}

  private async resolveDataset(
    dataset: EvaluationDataset,
    trustUpstreamDataset: boolean
  ): Promise<{ dataset: EvaluationDataset; upstreamId?: string }> {
    if (!trustUpstreamDataset) {
      return { dataset };
    }

    if (!this.options.getDatasetByName) {
      throw new Error(
        'KibanaEvalsClient runExperiment called with trustUpstreamDataset=true, but getDatasetByName is not configured'
      );
    }

    const upstreamDataset = await this.options.getDatasetByName(dataset.name);
    if (!upstreamDataset) {
      throw new Error(
        `KibanaEvalsClient could not resolve upstream dataset by name: "${dataset.name}"`
      );
    }

    const { id, name, description, tags, maturity, examples } = upstreamDataset;
    return {
      dataset: {
        name,
        description,
        tags,
        maturity,
        examples,
      },
      upstreamId: id,
    };
  }

  async runExperiment<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    {
      name,
      datasets,
      task,
      metadata: experimentMetadata,
      concurrency,
      trustUpstreamDataset = false,
    }: {
      name?: string;
      datasets: TEvaluationDataset[];
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency?: number;
      trustUpstreamDataset?: boolean;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<DatasetRunResult[]> {
    const experimentName = name ?? datasets[0].name;
    const runConcurrency = this.resolveConcurrency(experimentName, concurrency);

    const results: DatasetRunResult[] = [];
    for (const ds of datasets) {
      results.push(
        await this.runSingleDatasetExperiment(
          {
            experimentName,
            dataset: ds,
            task,
            metadata: experimentMetadata,
            concurrency: runConcurrency,
            trustUpstreamDataset,
          },
          evaluators
        )
      );
    }
    return results;
  }

  private resolveConcurrency(experimentName: string, specConcurrency?: number): number {
    const {
      concurrency = DEFAULT_EXPERIMENT_CONCURRENCY,
      requestedConcurrency,
      log,
    } = this.options;
    if (specConcurrency === undefined) {
      return concurrency;
    }

    if (requestedConcurrency !== undefined && specConcurrency !== requestedConcurrency) {
      log.warning(
        `Experiment "${experimentName}" sets its own concurrency (${specConcurrency}), so the requested --concurrency / EVAL_CONCURRENCY (${requestedConcurrency}) does not apply to it.`
      );
    }
    return specConcurrency;
  }

  private async runSingleDatasetExperiment<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    {
      experimentName,
      dataset,
      task,
      metadata: experimentMetadata,
      concurrency,
      trustUpstreamDataset = false,
    }: {
      experimentName: string;
      dataset: TEvaluationDataset;
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency: number;
      trustUpstreamDataset?: boolean;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<DatasetRunResult> {
    return withInferenceContext(async () => {
      const { dataset: resolvedDataset, upstreamId } = await this.resolveDataset(
        dataset,
        trustUpstreamDataset
      );
      const upsertedId = await this.options.upsertDataset?.(resolvedDataset);

      // Scores are stamped with this id, so it has to be the one the server
      // stored the dataset under. Deriving it locally is a last resort: ids
      // follow the owning space, which only the server knows here.
      const datasetId =
        upsertedId || upstreamId || getDatasetId(DEFAULT_SPACE_ID, resolvedDataset.name);
      const experimentId = computeExperimentId(
        this.options.executionId,
        experimentName,
        this.options.model.id
      );
      await this.options.onExperimentStart?.({ experimentId });
      const repetitions = this.options.repetitions ?? 3;
      const runConcurrency = Math.max(1, concurrency);
      const limiter = pLimit(runConcurrency);

      const evaluationRuns: DatasetRunResult['evaluationRuns'] = [];
      const runs: DatasetRunResult['runs'] = {};

      const runJobs: Array<Promise<void>> = [];

      this.options.log.info(
        `🧪 Starting experiment "${experimentName} - Dataset: ${resolvedDataset.name}" with ${evaluators.length} evaluators and ${runConcurrency} concurrent runs`
      );

      for (let rep = 0; rep < repetitions; rep++) {
        resolvedDataset.examples.forEach((example, exampleIndex) => {
          runJobs.push(
            limiter(async () => {
              const runKey = `${exampleIndex}-${rep}-${randomUUID()}`;

              this.options.log.info(
                `🔧 Running task "${resolvedDataset.name}" on dataset "${datasetId}" (exampleIndex=${exampleIndex}, repetition=${rep})`
              );

              let traceId: string | null | undefined;
              let taskOutput: TTaskOutput | null = null;
              let taskErrorMessage: string | undefined;
              try {
                taskOutput = await withTaskSpan(
                  resolvedDataset.name,
                  {
                    attributes: {
                      'dataset.name': resolvedDataset.name,
                      'dataset.id': datasetId,
                    },
                  },
                  async () => {
                    traceId = getCurrentTraceId();
                    return task(example);
                  }
                );
              } catch (error) {
                taskErrorMessage = toErrorMessage(error);
                this.options.log.error(
                  `❌ Task "${resolvedDataset.name}" failed (exampleIndex=${exampleIndex}, repetition=${rep}): ${taskErrorMessage}`
                );
              }

              // Prefer the trace id the task itself surfaced (e.g. converse's response
              // trace_id) over the eval client's own task-span trace id. See #276308.
              const taskOrClientTraceId =
                (taskOutput as { traceId?: string } | null)?.traceId || traceId;

              runs[runKey] = {
                exampleIndex,
                repetition: rep,
                input: example.input,
                expected: example.output ?? null,
                metadata: example.metadata ?? {},
                output: taskOutput,
                traceId: taskOrClientTraceId,
                ...(taskErrorMessage !== undefined && { taskError: { message: taskErrorMessage } }),
              };

              this.options.log.info(
                `🧠 Evaluating run (exampleIndex=${exampleIndex}, repetition=${rep}) with ${evaluators.length} evaluators`
              );

              const results = await Promise.all(
                evaluators.map(async (evaluator) => {
                  const evaluatorSummary = {
                    evaluatorName: evaluator.name,
                    direction: evaluator.direction,
                    kind: evaluator.kind,
                  };

                  // Evaluators score task output, so a failed task has nothing to score. Running
                  // them on a missing output would turn the task failure into a false 0.
                  if (taskErrorMessage !== undefined) {
                    return {
                      ...evaluatorSummary,
                      result: toErrorResult(taskErrorMessage),
                      evaluatorTraceId: undefined,
                      model: readEvaluatorAttribute(() => evaluator.getModel?.()),
                      version: readEvaluatorAttribute(() => evaluator.getVersion?.()),
                    };
                  }

                  this.options.log.info(
                    `🧠 Evaluating run (exampleIndex=${exampleIndex}, repetition=${rep}) with evaluator "${evaluator.name}"`
                  );
                  let evaluatorTraceId: string | null | undefined;
                  try {
                    const result = await withEvaluatorSpan(evaluator.name, {}, async () => {
                      evaluatorTraceId = getCurrentTraceId();
                      return evaluator.evaluate({
                        input: example.input,
                        output: {
                          // Not null here: a failed task returned before reaching this call.
                          ...(taskOutput as object),
                          traceId: taskOrClientTraceId,
                        } as TTaskOutput,
                        expected: example.output ?? null,
                        metadata: example.metadata ?? {},
                      });
                    });
                    this.options.log.info(
                      `✅ Evaluator "${evaluator.name}" on run (exampleIndex=${exampleIndex}, repetition=${rep}) completed`
                    );
                    return {
                      ...evaluatorSummary,
                      result,
                      evaluatorTraceId,
                      // Read after `evaluate` so evaluators that learn their model from
                      // the `_evaluate` response have it by now.
                      model: readEvaluatorAttribute(() => evaluator.getModel?.()),
                      version: readEvaluatorAttribute(() => evaluator.getVersion?.()),
                    };
                  } catch (error) {
                    const message = toErrorMessage(error);
                    this.options.log.error(
                      `❌ Evaluator "${evaluator.name}" failed on run (exampleIndex=${exampleIndex}, repetition=${rep}): ${message}`
                    );
                    return {
                      ...evaluatorSummary,
                      result: toErrorResult(message),
                      evaluatorTraceId,
                      model: readEvaluatorAttribute(() => evaluator.getModel?.()),
                      version: readEvaluatorAttribute(() => evaluator.getVersion?.()),
                    };
                  }
                })
              );

              for (const {
                evaluatorName,
                direction,
                result,
                evaluatorTraceId,
                kind,
                model,
                version,
              } of results) {
                const evalRun = {
                  name: evaluatorName,
                  ...(version && { version }),
                  result,
                  experimentRunId: runKey,
                  traceId: evaluatorTraceId,
                  exampleId: example.id,
                  direction,
                  kind,
                  ...(model && { model }),
                };
                evaluationRuns.push(evalRun);

                if (this.options.onEvaluationComplete) {
                  try {
                    await this.options.onEvaluationComplete({
                      experimentId,
                      experimentName,
                      datasetId,
                      datasetName: resolvedDataset.name,
                      taskRun: runs[runKey],
                      evaluationRun: evalRun,
                      exampleId: example.id ?? String(exampleIndex),
                    });
                  } catch (err) {
                    this.options.log.warning(
                      `Incremental score export failed for experiment "${experimentName}" (example=${exampleIndex}, repetition=${rep}): ${err}`
                    );
                  }
                }
              }
            })
          );
        });
      }

      await Promise.all(runJobs);
      this.options.log.info(`✅ Experiment ${experimentId} completed`);

      const result: DatasetRunResult = {
        id: experimentId,
        experimentName,
        datasetId,
        datasetName: resolvedDataset.name,
        datasetDescription: resolvedDataset.description,
        runs,
        evaluationRuns,
        experimentMetadata: {
          ...experimentMetadata,
          model: this.options.model,
          executionId: this.options.executionId,
        },
      };

      this.datasetRunResults.push(result);
      return result;
    });
  }

  async getDatasetRunResults(): Promise<DatasetRunResult[]> {
    return this.datasetRunResults;
  }
}
