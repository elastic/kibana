/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import type { StreamsEvaluationWorkerFixtures } from '../src/types';
import type {
  FeatureIdentificationEvaluationDataset,
  FeatureIdentificationEvaluationExample,
} from './features_identification_datasets';
import { FEATURE_IDENTIFICATION_DATASETS } from './features_identification_datasets';

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe(
  'Streams features identification',
  { tag: tags.serverless.observability.complete },
  () => {
    async function runFeatureIdentificationExperiment(
      dataset: FeatureIdentificationEvaluationDataset,
      {
        phoenixClient,
        inferenceClient,
        logger,
        evaluators,
      }: Pick<
        StreamsEvaluationWorkerFixtures,
        'phoenixClient' | 'inferenceClient' | 'logger' | 'evaluators'
      >
    ) {
      await phoenixClient.runExperiment(
        {
          dataset,
          concurrency: 1,
          task: async ({ input }: { input: FeatureIdentificationEvaluationExample['input'] }) => {
            const { features } = await identifyFeatures({
              streamName: 'logs.test',
              sampleDocuments: input.sample_documents,
              systemPrompt: featuresPrompt,
              inferenceClient,
              logger,
              signal: new AbortController().signal,
            });

            return { features };
          },
        },
        [
          {
            name: 'feature_correctness',
            kind: 'LLM',
            evaluate: async ({ input, output, expected, metadata }) => {
              const result = await evaluators.criteria(expected.criteria).evaluate({
                input,
                expected,
                output: output.features,
                metadata,
              });

              return result;
            },
          },
        ]
      );
    }

    // Run evaluation for each dataset
    FEATURE_IDENTIFICATION_DATASETS.forEach((dataset) => {
      evaluate.describe(dataset.name, () => {
        evaluate(
          'feature identification',
          async ({ evaluators, inferenceClient, logger, phoenixClient }) => {
            await runFeatureIdentificationExperiment(dataset, {
              inferenceClient,
              logger,
              phoenixClient,
              evaluators,
            });
          }
        );
      });
    });
  }
);
