/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pLimit from 'p-limit';
import { Agent, fetch as undiciFetch } from 'undici';
import type { PhoenixClient } from '@arizeai/phoenix-client';
import { createClient } from '@arizeai/phoenix-client';
import type { RanExperiment, TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { DatasetInfo, Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import { withInferenceContext } from '@kbn/inference-tracing';
import type { Evaluator, EvaluationDataset, ExperimentTask } from '../types';
import { upsertDataset } from './upsert_dataset';
import type { PhoenixConfig } from '../utils/get_phoenix_config';

const PHOENIX_CONNECT_TIMEOUT_MS = 60_000;
const PHOENIX_HEADERS_TIMEOUT_MS = 60_000;
const PHOENIX_BODY_TIMEOUT_MS = 5 * 60_000;

const phoenixAgent = new Agent({
  connectTimeout: PHOENIX_CONNECT_TIMEOUT_MS,
  headersTimeout: PHOENIX_HEADERS_TIMEOUT_MS,
  bodyTimeout: PHOENIX_BODY_TIMEOUT_MS,
});

export async function phoenixFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // openapi-fetch passes a Request object, but undici.fetch doesn't handle
  // the global Request type the same way. Extract URL and init from Request.
  if (input instanceof Request) {
    const request = input;
    const url = request.url;
    const body = request.body;
    const mergedInit = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      duplex: body ? 'half' : undefined,
      ...init,
    };
    return undiciFetch(url, {
      ...mergedInit,
      dispatcher: phoenixAgent,
    } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }

  const fetchInit = {
    ...init,
    duplex: init?.body ? 'half' : undefined,
    dispatcher: phoenixAgent,
  };

  return undiciFetch(
    input as Parameters<typeof undiciFetch>[0],
    fetchInit as Parameters<typeof undiciFetch>[1]
  ) as unknown as Promise<Response>;
}

export class KibanaPhoenixClient {
  private readonly phoenixClient: PhoenixClient;

  private readonly experiments: RanExperiment[] = [];

  constructor(
    private readonly options: {
      config: PhoenixConfig;
      log: SomeDevLog;
      model: Model;
      runId: string;
      repetitions?: number;
    }
  ) {
    this.phoenixClient = createClient({
      options: {
        ...this.options.config,
        fetch: phoenixFetch,
      },
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

  async getDatasetByName(name: string): Promise<DatasetInfo> {
    const response = await this.phoenixClient.GET('/v1/datasets', {
      params: {
        query: {
          name,
        },
      },
    });

    const datasets = response.data?.data ?? [];

    if (datasets.length === 0) {
      throw new Error(`Phoenix dataset not found: ${name}`);
    }

    if (datasets.length > 1) {
      throw new Error(
        `Multiple Phoenix datasets found for name: ${name}. Please ensure dataset names are unique.`
      );
    }

    return datasets[0];
  }

  async runExperiment<TEvaluationDataset extends EvaluationDataset, TTaskOutput extends TaskOutput>(
    options: {
      dataset: TEvaluationDataset;
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency?: number;
      /**
       * If true, the dataset is assumed to already exist in Phoenix and we will
       * use its id (resolved by name) instead of creating/upserting it from code.
       */
      trustUpstreamDataset?: boolean;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment>;

  async runExperiment(
    {
      dataset,
      task,
      metadata: experimentMetadata,
      concurrency,
      trustUpstreamDataset,
    }: {
      dataset: EvaluationDataset;
      task: ExperimentTask<Example, TaskOutput>;
      metadata?: Record<string, unknown>;
      concurrency?: number;
      trustUpstreamDataset?: boolean;
    },
    evaluators: Evaluator[]
  ): Promise<RanExperiment> {
    return withInferenceContext(async () => {
      const datasetId = trustUpstreamDataset
        ? (await this.getDatasetByName(dataset.name)).id
        : (
            await this.syncDataSet({
              name: dataset.name,
              description: dataset.description,
              examples: dataset.examples,
            })
          ).datasetId;

      const experiments = await import('@arizeai/phoenix-client/experiments');

      const ranExperiment = await experiments.runExperiment({
        client: this.phoenixClient,
        dataset: { datasetId },
        experimentName: `Run ID: ${this.options.runId} - Dataset: ${dataset.name}`,
        task,
        experimentMetadata: {
          ...experimentMetadata,
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
        repetitions: this.options.repetitions ?? 1,
        concurrency,
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
