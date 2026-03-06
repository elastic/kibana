/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { getSampleDocuments } from '@kbn/ai-tools';
import { tags } from '@kbn/scout';
import { isDuplicateFeature } from '@kbn/streams-schema';
import { identifyFeatures, type DeletedFeatureSummary } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { sampleSize as lodashSampleSize } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import { evaluate } from '../../../src/evaluate';
import {
  FEATURES_SOFT_DELETE_DATASETS,
  type FeaturesSoftDeleteEvaluationDataset,
} from './features_soft_delete_datasets';
import { indexSynthtraceScenario } from '../../synthtrace_helpers';
import {
  createSoftDeleteSemanticEvaluator,
  type SoftDeleteTaskOutput,
} from '../../../src/evaluators/soft_delete/soft_delete_evaluators';

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Streams features soft delete', () => {
  const from = kbnDatemath.parse('now-10m')!;
  const to = kbnDatemath.parse('now')!;

  async function fetchSampleDocuments({
    esClient,
    streamName,
    sampleSize,
    logger,
  }: {
    esClient: ElasticsearchClient;
    streamName: string;
    sampleSize: number;
    logger: Logger;
  }) {
    const { hits: sampleDocuments } = await getSampleDocuments({
      esClient,
      index: streamName,
      size: sampleSize,
      start: from.valueOf(),
      end: to.valueOf(),
    });

    logger.info(`Fetched ${sampleDocuments.length} sample documents from ${streamName}`);

    if (sampleDocuments.length === 0) {
      throw new Error(
        `No sample documents found in ${streamName} for the given time range. Ensure data has been indexed before running the experiment.`
      );
    }

    return sampleDocuments;
  }

  async function runSoftDeleteExperiment({
    esClient,
    streamName,
    deleteCount,
    followUpRuns,
    inferenceClient,
    logger,
    sampleSize,
  }: {
    esClient: ElasticsearchClient;
    streamName: string;
    deleteCount: number;
    followUpRuns: number;
    inferenceClient: BoundInferenceClient;
    logger: Logger;
    sampleSize: number;
  }): Promise<SoftDeleteTaskOutput> {
    const initialSampleDocuments = await fetchSampleDocuments({
      esClient,
      streamName,
      sampleSize,
      logger,
    });

    const { features: initialFeatures } = await identifyFeatures({
      streamName,
      sampleDocuments: initialSampleDocuments,
      systemPrompt: featuresPrompt,
      inferenceClient,
      logger,
      signal: new AbortController().signal,
    });

    logger.info(`Initial identification returned ${initialFeatures.length} features`);

    if (initialFeatures.length < deleteCount) {
      logger.info(
        `Not enough features identified (${initialFeatures.length}) to delete ${deleteCount}, skipping follow-up runs`
      );
      return {
        initialFeatures,
        deletedFeatures: [],
        followUpRuns: [],
      };
    }

    const featuresToDelete = lodashSampleSize(initialFeatures, deleteCount);
    const deletedFeatures: DeletedFeatureSummary[] = featuresToDelete.map(
      ({ id, type, subtype, title, description, properties }) => ({
        id,
        type,
        subtype,
        title,
        description,
        properties,
      })
    );

    const outputs: SoftDeleteTaskOutput['followUpRuns'] = [];

    for (let i = 0; i < followUpRuns; i++) {
      const sampleDocuments = await fetchSampleDocuments({
        esClient,
        streamName,
        sampleSize,
        logger,
      });

      const { features: rawFeatures, ignoredFeatures } = await identifyFeatures({
        streamName,
        sampleDocuments,
        deletedFeatures,
        systemPrompt: featuresPrompt,
        inferenceClient,
        logger,
        signal: new AbortController().signal,
      });

      const features = rawFeatures.filter(
        (feature) => !deletedFeatures.some((deleted) => isDuplicateFeature(feature, deleted))
      );

      outputs.push({ features, rawFeatures, ignoredFeatures });
    }

    return {
      initialFeatures,
      deletedFeatures,
      followUpRuns: outputs,
    };
  }

  FEATURES_SOFT_DELETE_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
      evaluate.beforeAll(async ({ apiServices }) => {
        await apiServices.streams.enable();
      });

      evaluate.afterAll(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices
          .deleteDataStream({ name: dataset.input.stream_name })
          .catch(() => {});
      });

      evaluate(
        dataset.name,
        async ({
          config,
          esClient,
          inferenceClient,
          evaluationConnector,
          evaluators,
          traceEsClient,
          log,
          logger,
          executorClient,
        }) => {
          const evaluatorInferenceClient = inferenceClient.bindTo({
            connectorId: evaluationConnector.id,
          });

          await indexSynthtraceScenario({
            scenario: dataset.input.scenario,
            scenarioOpts: dataset.input.scenarioOpts,
            config,
            from,
            to,
          });

          await esClient.indices.refresh({ index: dataset.input.stream_name });

          await executorClient.runExperiment(
            {
              dataset: {
                name: dataset.name,
                description: dataset.description,
                examples: [{ input: dataset.input }],
              },
              task: async ({
                input,
              }: {
                input: Pick<
                  FeaturesSoftDeleteEvaluationDataset['input'],
                  'stream_name' | 'delete_count' | 'follow_up_runs' | 'sample_document_count'
                >;
              }) => {
                const result = await runSoftDeleteExperiment({
                  esClient,
                  streamName: input.stream_name,
                  deleteCount: input.delete_count,
                  followUpRuns: input.follow_up_runs,
                  inferenceClient,
                  logger,
                  sampleSize: input.sample_document_count,
                });
                const traceId = getCurrentTraceId();
                return { ...result, traceId };
              },
            },
            [
              createSoftDeleteSemanticEvaluator({ inferenceClient: evaluatorInferenceClient }),
              evaluators.traceBasedEvaluators.inputTokens,
              evaluators.traceBasedEvaluators.outputTokens,
              evaluators.traceBasedEvaluators.cachedTokens,
              createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
            ]
          );
        }
      );
    });
  });
});
