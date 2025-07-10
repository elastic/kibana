/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { PhoenixClient } from '@arizeai/phoenix-client';
import { RanExperiment, TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { SomeDevLog } from '@kbn/some-dev-log';
import { withInferenceSpan } from '@kbn/inference-tracing';
import { Model } from '@kbn/inference-common';
import { Evaluator, EvaluationDataset, ExperimentTask } from '../types';
import { upsertDataset } from './upsert_dataset';

export class KibanaPhoenixClient {
  constructor(
    private readonly phoenixClient: PhoenixClient,
    private readonly log: SomeDevLog,
    private readonly model: Model
  ) {}

  private async syncDataSet(dataset: EvaluationDataset): Promise<{ datasetId: string }> {
    const datasets = await import('@arizeai/phoenix-client/datasets');

    const getDatasetsByNameResponse = await this.phoenixClient.GET('/v1/datasets', {
      params: {
        query: {
          name: dataset.name,
        },
      },
    });

    if (!getDatasetsByNameResponse.data?.data.length) {
      const { datasetId } = await datasets.createDataset({
        client: this.phoenixClient,
        name: dataset.name,
        description: dataset.description,
        examples: dataset.examples.map((example) => {
          return {
            input: example.input,
            output: example.output ?? null,
            metadata: example.metadata ?? {},
          };
        }),
      });

      return { datasetId };
    }

    const storedDataset = getDatasetsByNameResponse.data.data[0];

    const examplesResponse = await this.phoenixClient.GET('/v1/datasets/{id}/examples', {
      params: {
        path: {
          id: storedDataset.id,
        },
      },
    });

    await upsertDataset({
      phoenixClient: this.phoenixClient,
      datasetId: storedDataset.id,
      storedExamples: examplesResponse.data?.data.examples ?? [],
      nextExamples: dataset.examples,
    });

    return { datasetId: storedDataset.id };
  }

  async runExperiment<TEvaluationDataset extends EvaluationDataset, TTaskOutput extends TaskOutput>(
    {
      dataset,
      task,
    }: {
      dataset: TEvaluationDataset;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment>;
  async runExperiment(
    {
      dataset,
      task,
    }: {
      dataset: EvaluationDataset;
      task: ExperimentTask<Example, TaskOutput>;
    },
    evaluators: Evaluator[]
  ): Promise<RanExperiment> {
    const { datasetId } = await this.syncDataSet(dataset);

    // Because of a bug in the CommonJS distribution of
    // @arizeai/phoenix, we have to import the ESM one,
    // which means we also have to trick Node.js into
    // allowing us to import it.
    const path = Path.join(
      Path.dirname(require.resolve('@arizeai/phoenix-client')),
      '../esm/experiments/index.js'
    );

    const experiments = (await import(
      path
    )) as typeof import('@arizeai/phoenix-client/experiments');

    const ranExperiment = await experiments.runExperiment({
      client: this.phoenixClient,
      dataset: { datasetId },
      task,
      experimentMetadata: {
        model: this.model,
      },
      evaluators: evaluators.map((evaluator) => {
        return {
          ...evaluator,
          evaluate: ({ input, output, expected, metadata }) => {
            return withInferenceSpan('evaluate', () =>
              evaluator.evaluate({
                expected: expected ?? null,
                input,
                metadata: metadata ?? {},
                output,
              })
            );
          },
        };
      }),
      logger: {
        error: this.log.error.bind(this.log),
        info: this.log.info.bind(this.log),
        log: this.log.info.bind(this.log),
      },
    });

    return ranExperiment;
  }
}
