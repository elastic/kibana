/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PhoenixClient } from '@arizeai/phoenix-client';
import { createClient } from '@arizeai/phoenix-client';
import type { DatasetInfo } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type {
  ExperimentRun,
  ExperimentEvaluationRun,
} from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import { withInferenceContext } from '@kbn/inference-tracing';
import type {
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ExperimentTask,
  RanExperiment,
  TaskOutput,
} from '../types';
import { upsertDataset } from './upsert_dataset';
import type { PhoenixConfig } from '../utils/get_phoenix_config';

/**
 * Phoenix-backed eval runner. This remains supported as an option during the migration,
 * but the rest of `@kbn/evals` should depend only on the shared runner interface + types.
 */
export class KibanaPhoenixClient implements EvalsExecutorClient {
  private readonly phoenixClient: PhoenixClient;
  private readonly allowPhoenixDatasetDeleteRecreateFallback: boolean;

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
      options: this.options.config,
    });
    this.allowPhoenixDatasetDeleteRecreateFallback =
      process.env.KBN_EVALS_PHOENIX_ALLOW_DATASET_DELETE_RECREATE_FALLBACK === 'true';
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
            output: (example.output ?? null) as any,
            metadata: (example.metadata ?? {}) as any,
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

    try {
      await upsertDataset({
        phoenixClient: this.phoenixClient,
        datasetId: storedDataset.id,
        storedExamples: (examplesResponse.data?.data.examples ?? []) as any,
        nextExamples: dataset.examples as any,
      });
    } catch (error) {
      // Some Phoenix versions/environments intermittently fail the GraphQL dataset upsert.
      // Deleting a dataset wipes all past experiments on that dataset, so only do this with explicit consent.
      if (!this.allowPhoenixDatasetDeleteRecreateFallback) {
        this.options.log.warning(
          `Phoenix dataset upsert failed for "${dataset.name}" (id: ${storedDataset.id}). ` +
            `Refusing to delete+recreate without explicit opt-in. ` +
            `To allow the destructive fallback (will wipe past experiments), set ` +
            `KBN_EVALS_PHOENIX_ALLOW_DATASET_DELETE_RECREATE_FALLBACK=true.`
        );
        this.options.log.debug(error);
        throw error;
      }

      const message = `Phoenix dataset upsert failed for "${dataset.name}" (id: ${storedDataset.id}); falling back to delete+recreate`;
      this.options.log.warning(message);
      this.options.log.debug(error);

      await this.phoenixClient.DELETE('/v1/datasets/{id}', {
        params: { path: { id: storedDataset.id } },
      });

      const { datasetId } = await datasets.createDataset({
        client: this.phoenixClient,
        name: dataset.name,
        description: dataset.description,
        examples: dataset.examples.map((example) => {
          return {
            input: example.input,
            output: (example.output ?? null) as any,
            metadata: (example.metadata ?? {}) as any,
          };
        }),
      });

      return { datasetId };
    }

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
  ): Promise<RanExperiment> {
    return withInferenceContext(async () => {
      const {
        dataset,
        task,
        metadata: experimentMetadata,
        concurrency,
        trustUpstreamDataset,
      } = options;

      const datasetId = trustUpstreamDataset
        ? (await this.getDatasetByName(dataset.name)).id
        : (await this.syncDataSet(dataset)).datasetId;

      const experiments = await import('@arizeai/phoenix-client/experiments');

      const ran = await experiments.runExperiment({
        client: this.phoenixClient,
        dataset: { datasetId },
        experimentName: `Run ID: ${this.options.runId} - Dataset: ${dataset.name}`,
        // Phoenix expects its own task/evaluator types. Keep the adapter boundary here.
        task: task as any,
        experimentMetadata: {
          ...experimentMetadata,
          model: this.options.model,
          runId: this.options.runId,
        },
        setGlobalTracerProvider: false,
        evaluators: evaluators.map((evaluator) => {
          return {
            name: evaluator.name,
            kind: evaluator.kind,
            evaluate: ({ input, output, expected, metadata: md }: any) => {
              return evaluator.evaluate({
                expected: expected ?? null,
                input,
                metadata: md ?? {},
                output,
              });
            },
          };
        }) as any,
        logger: {
          error: this.options.log.error.bind(this.options.log),
          info: this.options.log.info.bind(this.options.log),
          log: this.options.log.info.bind(this.options.log),
        },
        repetitions: this.options.repetitions ?? 1,
        concurrency,
      });

      // Translate Phoenix's ExperimentRun structure to Kibana's TaskRun format
      const phoenixRuns: Record<string, ExperimentRun> = ran.runs ?? {};

      // Group runs by datasetExampleId to compute repetition indices
      const runsByExampleId = new Map<
        string,
        Array<{ runKey: string; phoenixRun: ExperimentRun }>
      >();
      for (const [runKey, phoenixRun] of Object.entries(phoenixRuns)) {
        const group = runsByExampleId.get(phoenixRun.datasetExampleId) ?? [];
        group.push({ runKey, phoenixRun });
        runsByExampleId.set(phoenixRun.datasetExampleId, group);
      }

      // Assign stable example indices based on insertion order
      const exampleIds = Array.from(runsByExampleId.keys());
      const exampleIdToIndex = new Map(exampleIds.map((id, index) => [id, index]));

      // Build TaskRun records
      const runs: RanExperiment['runs'] = {};
      for (const [exampleId, group] of runsByExampleId) {
        const exampleIndex = exampleIdToIndex.get(exampleId)!;
        const matchingExample = dataset.examples[exampleIndex] ?? {};

        group.forEach(({ runKey, phoenixRun }, repetition) => {
          runs[runKey] = {
            exampleIndex,
            repetition,
            input: matchingExample.input ?? {},
            expected: matchingExample.output ?? null,
            metadata: matchingExample.metadata ?? {},
            output: phoenixRun.output,
            traceId: phoenixRun.traceId,
          };
        });
      }

      // Map evaluation runs with their corresponding exampleId
      const evaluationRuns: RanExperiment['evaluationRuns'] = (ran.evaluationRuns ?? []).map(
        (evalRun: ExperimentEvaluationRun) => ({
          name: evalRun.name,
          result: evalRun.result ?? undefined,
          experimentRunId: evalRun.experimentRunId,
          traceId: evalRun.traceId,
          exampleId: phoenixRuns[evalRun.experimentRunId]?.datasetExampleId,
        })
      );

      const ranExperiment: RanExperiment = {
        id: ran.id ?? '',
        datasetId: ran.datasetId,
        datasetName: dataset.name,
        datasetDescription: dataset.description,
        runs,
        evaluationRuns,
        experimentMetadata: (ran as any).experimentMetadata as any,
      };

      this.experiments.push(ranExperiment);
      return ranExperiment;
    });
  }

  async getRanExperiments(): Promise<RanExperiment[]> {
    return this.experiments;
  }
}
