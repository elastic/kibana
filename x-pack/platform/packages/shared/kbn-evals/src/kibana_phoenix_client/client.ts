/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pLimit from 'p-limit';
import { PhoenixClient, createClient } from '@arizeai/phoenix-client';
import { RanExperiment, TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { DatasetInfo, Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { SomeDevLog } from '@kbn/some-dev-log';
import { withInferenceSpan } from '@kbn/inference-tracing';
import { Model } from '@kbn/inference-common';
import { Evaluator, EvaluationDataset, ExperimentTask } from '../types';
import { upsertDataset } from './upsert_dataset';
import { PhoenixConfig } from '../utils/get_phoenix_config';

export class KibanaPhoenixClient {
  private readonly phoenixClient: PhoenixClient;

  private readonly experiments: RanExperiment[] = [];

  constructor(
    private readonly options: {
      config: PhoenixConfig;
      log: SomeDevLog;
      model: Model;
      runId: string;
    }
  ) {
    this.phoenixClient = createClient({
      options: this.options.config,
    });
  }

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
    return await withInferenceSpan('run_experiment', async (span) => {
      const { datasetId } = await this.syncDataSet(dataset);

      const experiments = await import('@arizeai/phoenix-client/experiments');

      const ranExperiment = await experiments.runExperiment({
        client: this.phoenixClient,
        dataset: { datasetId },
        task,
        experimentMetadata: {
          model: this.options.model,
          runId: this.options.runId,
        },
        setGlobalTracerProvider: false,
        evaluators: evaluators.map((evaluator) => {
          return {
            ...evaluator,
            evaluate: ({ input, output, expected, metadata }) => {
              return evaluator.evaluate({
                expected: expected ?? null,
                input,
                metadata: metadata ?? {},
                output,
              });
            },
          };
        }),
        logger: {
          error: this.options.log.error.bind(this.options.log),
          info: this.options.log.info.bind(this.options.log),
          log: this.options.log.info.bind(this.options.log),
        },
      });

      this.experiments.push(ranExperiment);

      return ranExperiment;
    });
  }

  async getRanExperiments() {
    return this.experiments;
  }

  /**
   * Fetch dataset metadata for a list of IDs, returning a map id -> name.
   * Falls back to id if name cannot be fetched.
   */
  async getDatasets(ids: string[]): Promise<DatasetInfo[]> {
    const limiter = pLimit(5);

    const datasets = await Promise.all(
      ids.map(async (id) => {
        return limiter(() =>
          this.phoenixClient
            .GET('/v1/datasets/{id}', {
              params: { path: { id } },
            })
            .then((response) => {
              const dataset = response.data?.data;
              if (!dataset) {
                throw new Error(`Could not find dataset for ${id}`);
              }
              return dataset;
            })
        );
      })
    );

    return datasets;
  }
}
