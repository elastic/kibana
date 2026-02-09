/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import objectHash from 'object-hash';
import { omitBy, isEmpty } from 'lodash';
import { randomUUID } from 'crypto';
import { withInferenceContext } from '@kbn/inference-tracing';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type {
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ExperimentTask,
  Example,
  RanExperiment,
  TaskOutput,
} from '../types';
import { getCurrentTraceId, withEvaluatorSpan, withTaskSpan } from '../utils/tracing';

function normalizeExample(example: Example) {
  return {
    input: example.input,
    output: example.output ?? null,
    // keep parity with prior normalization: drop empty metadata keys
    metadata: omitBy(example.metadata ?? {}, isEmpty),
  };
}

function computeDatasetId(dataset: EvaluationDataset): string {
  return objectHash({
    name: dataset.name,
    description: dataset.description,
    examples: dataset.examples.map(normalizeExample),
  });
}

export class KibanaEvalsClient implements EvalsExecutorClient {
  private readonly experiments: RanExperiment[] = [];

  constructor(
    private readonly options: {
      log: SomeDevLog;
      model: Model;
      runId: string;
      repetitions?: number;
    }
  ) {}

  async runExperiment<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    {
      dataset,
      task,
      metadata: experimentMetadata,
      concurrency,
      trustUpstreamDataset: _trustUpstreamDataset,
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
      const datasetId = computeDatasetId(dataset);
      const experimentId = randomUUID();
      const repetitions = this.options.repetitions ?? 3;
      const runConcurrency = Math.max(1, concurrency ?? 5);
      const limiter = pLimit(runConcurrency);

      const evaluationRuns: RanExperiment['evaluationRuns'] = [];
      const runs: RanExperiment['runs'] = {};

      const runJobs: Array<Promise<void>> = [];

      this.options.log.info(
        `🧪 Starting experiment "Run ID: ${this.options.runId} - Dataset: ${dataset.name}" with ${evaluators.length} evaluators and ${runConcurrency} concurrent runs`
      );

      for (let rep = 0; rep < repetitions; rep++) {
        dataset.examples.forEach((example, exampleIndex) => {
          runJobs.push(
            limiter(async () => {
              const runKey = `${exampleIndex}-${rep}-${randomUUID()}`;

              this.options.log.info(
                `🔧 Running task "task" on dataset "${datasetId}" (exampleIndex=${exampleIndex}, repetition=${rep})`
              );

              const { taskOutput, traceId } = await withTaskSpan('task', {}, async () => {
                const _traceId = getCurrentTraceId();
                const _taskOutput = await task(example);
                return {
                  taskOutput: _taskOutput,
                  traceId: _traceId,
                };
              });

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

              results.forEach(({ evaluatorName, result, evaluatorTraceId }) => {
                evaluationRuns.push({
                  name: evaluatorName,
                  result,
                  experimentRunId: runKey,
                  traceId: evaluatorTraceId,
                });
              });
            })
          );
        });
      }

      await Promise.all(runJobs);
      this.options.log.info(`✅ Experiment ${experimentId} completed`);

      const ranExperiment: RanExperiment = {
        id: experimentId,
        datasetId,
        datasetName: dataset.name,
        datasetDescription: dataset.description,
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
