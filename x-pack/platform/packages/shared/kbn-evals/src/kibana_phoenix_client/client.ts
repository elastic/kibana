/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PhoenixClient } from '@arizeai/phoenix-client';
import { Evaluator, ExperimentTask } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { EvaluationDataset } from './types';
import { upsertDataset } from './upsert_dataset';

export class KibanaPhoenixClient {
  constructor(private readonly phoenixClient: PhoenixClient) {}

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

  async runExperiment({
    dataset,
    evaluators,
    task,
  }: {
    dataset: EvaluationDataset;
    evaluators: Evaluator[];
    task: ExperimentTask;
  }) {
    const { datasetId } = await this.syncDataSet(dataset);

    const experiments = await import('@arizeai/phoenix-client/experiments');

    await experiments.runExperiment({
      client: this.phoenixClient,
      dataset: { datasetId },
      task,
      evaluators,
    });
  }
}
