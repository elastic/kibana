/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { getSampleDocuments } from '@kbn/ai-tools';
import { tags } from '@kbn/scout';
import { type BaseFeature } from '@kbn/streams-schema';
import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { evaluate } from '../../../src/evaluate';
import { FEATURES_DUPLICATION_DATASETS } from './features_duplication_datasets';
import { indexSynthtraceScenario } from '../../synthtrace_helpers';
import {
  featureDuplicationEvaluator,
  createSemanticUniquenessEvaluator,
  createIdConsistencyEvaluator,
} from '../../../src/evaluators/feature_duplication_evaluators';

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Streams features duplication (harness)', () => {
  const from = kbnDatemath.parse('now-10m')!;
  const to = kbnDatemath.parse('now')!;

  async function runRepeatedFeatureIdentification({
    esClient,
    streamName,
    runs,
    inferenceClient,
    logger,
    sampleSize,
  }: {
    esClient: ElasticsearchClient;
    streamName: string;
    runs: number;
    inferenceClient: BoundInferenceClient;
    logger: Logger;
    sampleSize: number;
  }): Promise<{
    runs: Array<{
      features: BaseFeature[];
    }>;
  }> {
    const outputs: Array<{ features: BaseFeature[] }> = [];

    for (let i = 0; i < runs; i++) {
      const { hits: sampleDocuments } = await getSampleDocuments({
        esClient,
        index: streamName,
        size: sampleSize,
        start: from.valueOf(),
        end: to.valueOf(),
      });

      const { features } = await identifyFeatures({
        streamName,
        sampleDocuments,
        systemPrompt: featuresPrompt,
        inferenceClient,
        logger,
        signal: new AbortController().signal,
      });

      outputs.push({ features });
    }

    return { runs: outputs };
  }

  FEATURES_DUPLICATION_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
      evaluate.beforeAll(async ({ apiServices }) => {
        await apiServices.streams.enable();
      });

      evaluate.afterAll(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices.deleteDataStream({
          name: 'logs*',
        });
      });

      evaluate(
        dataset.name,
        async ({
          config,
          esClient,
          inferenceClient,
          evaluationConnector,
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
                input: { stream_name: string; runs: number; sample_document_count: number };
              }) => {
                return runRepeatedFeatureIdentification({
                  esClient,
                  streamName: input.stream_name,
                  runs: input.runs,
                  inferenceClient,
                  logger,
                  sampleSize: input.sample_document_count,
                });
              },
            },
            [
              featureDuplicationEvaluator,
              createSemanticUniquenessEvaluator({ inferenceClient: evaluatorInferenceClient }),
              createIdConsistencyEvaluator({ inferenceClient: evaluatorInferenceClient }),
            ]
          );
        }
      );
    });
  });
});
