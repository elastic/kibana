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
    }: {
      dataset: TEvaluationDataset;
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency?: number;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment> {
    return withInferenceContext(async () => {
      const datasetId = computeDatasetId(dataset);
      const experimentId = randomUUID();
      const repetitions = this.options.repetitions ?? 1;
      const runConcurrency = Math.max(1, concurrency ?? 1);
      const limiter = pLimit(runConcurrency);

      const evaluationRuns: RanExperiment['evaluationRuns'] = [];
      const runs: RanExperiment['runs'] = {};

      const runJobs: Array<Promise<void>> = [];

      for (let rep = 0; rep < repetitions; rep++) {
        dataset.examples.forEach((example, exampleIndex) => {
          runJobs.push(
            limiter(async () => {
              const runKey = `${exampleIndex}-${rep}-${randomUUID()}`;

              const taskOutput = await task(example);

              runs[runKey] = {
                exampleIndex,
                repetition: rep,
                input: example.input,
                expected: example.output ?? null,
                metadata: example.metadata ?? {},
                output: taskOutput,
              };

              const results = await Promise.all(
                evaluators.map(async (evaluator) => {
                  const result = await evaluator.evaluate({
                    input: example.input,
                    output: taskOutput,
                    expected: example.output ?? null,
                    metadata: example.metadata ?? {},
                  });
                  return { evaluatorName: evaluator.name, result };
                })
              );

              results.forEach(({ evaluatorName, result }) => {
                evaluationRuns.push({
                  name: evaluatorName,
                  result,
                });
              });
            })
          );
        });
      }

      await Promise.all(runJobs);

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


