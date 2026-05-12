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
import { DATASET_UUID_NAMESPACE } from '@kbn/evals-common';
import type {
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  EvaluationDatasetWithId,
  ExperimentTask,
  OnEvaluationComplete,
  RanExperiment,
  TaskOutput,
} from '../types';
import { getCurrentTraceId, withEvaluatorSpan, withTaskSpan } from '../utils/tracing';

function computeDatasetId(name: string): string {
  return uuidv5(name, DATASET_UUID_NAMESPACE);
}

export class KibanaEvalsClient implements EvalsExecutorClient {
  private readonly experiments: RanExperiment[] = [];

  constructor(
    private readonly options: {
      log: SomeDevLog;
      model: Model;
      runId: string;
      repetitions?: number;
      upsertDataset?: (dataset: EvaluationDataset) => Promise<void>;
      getDatasetByName?: (
        datasetName: string
      ) => Promise<EvaluationDataset | EvaluationDatasetWithId | null>;
      onEvaluationComplete?: OnEvaluationComplete;
    }
  ) {}

  private async resolveDataset(
    dataset: EvaluationDataset,
    trustUpstreamDataset: boolean
  ): Promise<EvaluationDataset> {
    if (!trustUpstreamDataset) {
      return dataset;
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

    const { name, description, examples } = upstreamDataset;
    return {
      name,
      description,
      examples,
    };
  }

  async runExperiment<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    {
      dataset,
      task,
      metadata: experimentMetadata,
      concurrency,
      trustUpstreamDataset = false,
    }: {
      dataset: TEvaluationDataset;
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency?: number;
      trustUpstreamDataset?: boolean;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment> {
    return withInferenceContext(async () => {
      const resolvedDataset = await this.resolveDataset(dataset, trustUpstreamDataset);
      await this.options.upsertDataset?.(resolvedDataset);

      const datasetId = computeDatasetId(resolvedDataset.name);
      const experimentId = randomUUID();
      const repetitions = this.options.repetitions ?? 3;
      const runConcurrency = Math.max(1, concurrency ?? 5);
      const limiter = pLimit(runConcurrency);

      const evaluationRuns: RanExperiment['evaluationRuns'] = [];
      const runs: RanExperiment['runs'] = {};

      const runJobs: Array<Promise<void>> = [];

      this.options.log.info(
        `🧪 Starting experiment "Run ID: ${this.options.runId} - Dataset: ${resolvedDataset.name}" with ${evaluators.length} evaluators and ${runConcurrency} concurrent runs`
      );

      for (let rep = 0; rep < repetitions; rep++) {
        resolvedDataset.examples.forEach((example, exampleIndex) => {
          runJobs.push(
            limiter(async () => {
              const runKey = `${exampleIndex}-${rep}-${randomUUID()}`;

              this.options.log.info(
                `🔧 Running task "${resolvedDataset.name}" on dataset "${datasetId}" (exampleIndex=${exampleIndex}, repetition=${rep})`
              );

              const { taskOutput, traceId } = await withTaskSpan(
                resolvedDataset.name,
                {
                  attributes: {
                    'dataset.name': resolvedDataset.name,
                    'dataset.id': datasetId,
                  },
                },
                async () => {
                  const _traceId = getCurrentTraceId();
                  const _taskOutput = await task(example);
                  return {
                    taskOutput: _taskOutput,
                    traceId: _traceId,
                  };
                }
              );

              runs[runKey] = {
                exampleIndex,
                repetition: rep,
                input: example.input,
                expected: example.output ?? null,
                metadata: example.metadata ?? {},
                output: taskOutput,
                traceId,
              };

              this.options.log.info(
                `🧠 Evaluating run (exampleIndex=${exampleIndex}, repetition=${rep}) with ${evaluators.length} evaluators`
              );

              const results = await Promise.all(
                evaluators.map(async (evaluator) => {
                  this.options.log.info(
                    `🧠 Evaluating run (exampleIndex=${exampleIndex}, repetition=${rep}) with evaluator "${evaluator.name}"`
                  );
                  const { result, evaluatorTraceId } = await withEvaluatorSpan(
                    evaluator.name,
                    {},
                    async () => {
                      const _traceId = getCurrentTraceId();
                      const _result = await evaluator.evaluate({
                        input: example.input,
                        output: taskOutput,
                        expected: example.output ?? null,
                        metadata: example.metadata ?? {},
                      });
                      return {
                        result: _result,
                        evaluatorTraceId: _traceId,
                      };
                    }
                  );
                  this.options.log.info(
                    `✅ Evaluator "${evaluator.name}" on run (exampleIndex=${exampleIndex}, repetition=${rep}) completed`
                  );
                  return { evaluatorName: evaluator.name, result, evaluatorTraceId };
                })
              );

              for (const { evaluatorName, result, evaluatorTraceId } of results) {
                const evalRun = {
                  name: evaluatorName,
                  result,
                  experimentRunId: runKey,
                  traceId: evaluatorTraceId,
                  exampleId: example.id,
                };
                evaluationRuns.push(evalRun);

                if (this.options.onEvaluationComplete) {
                  try {
                    await this.options.onEvaluationComplete({
                      experimentId,
                      datasetId,
                      datasetName: resolvedDataset.name,
                      taskRun: runs[runKey],
                      evaluationRun: evalRun,
                      exampleId: example.id ?? String(exampleIndex),
                    });
                  } catch (err) {
                    this.options.log.warning(
                      `Incremental score export failed (will retry in batch): ${err}`
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

      const ranExperiment: RanExperiment = {
        id: experimentId,
        datasetId,
        datasetName: resolvedDataset.name,
        datasetDescription: resolvedDataset.description,
        runs,
        evaluationRuns,
        experimentMetadata: {
          ...experimentMetadata,
          model: this.options.model,
          runId: this.options.runId,
        },
      };

      this.experiments.push(ranExperiment);
      return ranExperiment;
    });
  }

  async getRanExperiments(): Promise<RanExperiment[]> {
    return this.experiments;
  }
}
