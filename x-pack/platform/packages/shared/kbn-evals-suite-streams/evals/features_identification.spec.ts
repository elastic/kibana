/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { baseFeatureSchema } from '@kbn/streams-schema';
import { evaluate } from '../src/evaluate';
import type { StreamsEvaluationWorkerFixtures } from '../src/types';
import type {
  FeatureIdentificationEvaluationDataset,
  FeatureIdentificationEvaluationExample,
} from './features_identification_datasets';
import { FEATURE_IDENTIFICATION_DATASETS } from './features_identification_datasets';

/**
 * CODE-based evaluator that validates feature outputs against schema and business rules.
 * Checks:
 * 1. Schema compliance via baseFeatureSchema
 * 2. Confidence range validity (30-100 per system prompt requirements)
 * 3. Evidence array bounds (2-5 items as required by system prompt)
 * 4. Required fields presence
 */
const codeBasedEvaluator = {
  name: 'feature_schema_validator',
  kind: 'CODE' as const,
  evaluate: async ({ output }: { output: { features?: unknown[] } }) => {
    const features = output?.features ?? [];

    if (features.length === 0) {
      return {
        score: 1,
        details: {
          schemaValidityRate: 1,
          confidenceValidityRate: 1,
          evidenceValidityRate: 1,
          totalFeatures: 0,
          note: 'No features to validate',
        },
      };
    }

    const validationResults = features.map((feature) => {
      // 1. Schema validation using baseFeatureSchema
      const schemaResult = baseFeatureSchema.safeParse(feature);

      // Type guard to safely access feature properties
      const typedFeature = feature as Record<string, unknown>;

      // 2. Confidence range validation (30-100 per system prompt)
      // System prompt says: "Accept features with confidence ≥ 30"
      const confidence =
        typeof typedFeature.confidence === 'number' ? typedFeature.confidence : null;
      const isConfidenceValid = confidence !== null && confidence >= 30 && confidence <= 100;

      // 3. Evidence array bounds validation (2-5 items per system prompt)
      // System prompt says: "Provide 2–5 short, specific evidence strings per feature"
      const evidence = Array.isArray(typedFeature.evidence) ? typedFeature.evidence : null;
      const isEvidenceValid = evidence !== null && evidence.length >= 2 && evidence.length <= 5;

      return {
        schemaValid: schemaResult.success,
        schemaErrors: schemaResult.success ? null : schemaResult.error.issues,
        confidenceValid: isConfidenceValid,
        confidenceValue: confidence,
        evidenceValid: isEvidenceValid,
        evidenceCount: evidence?.length ?? 0,
      };
    });

    const total = features.length;
    const schemaValidCount = validationResults.filter((r) => r.schemaValid).length;
    const confidenceValidCount = validationResults.filter((r) => r.confidenceValid).length;
    const evidenceValidCount = validationResults.filter((r) => r.evidenceValid).length;

    const schemaValidityRate = schemaValidCount / total;
    const confidenceValidityRate = confidenceValidCount / total;
    const evidenceValidityRate = evidenceValidCount / total;

    // Combined score is the average of all three validation rates
    const score = (schemaValidityRate + confidenceValidityRate + evidenceValidityRate) / 3;

    return {
      score,
      details: {
        schemaValidityRate,
        confidenceValidityRate,
        evidenceValidityRate,
        totalFeatures: total,
        schemaValidCount,
        confidenceValidCount,
        evidenceValidCount,
        validationResults,
      },
    };
  },
};

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe('Streams features identification', { tag: '@svlOblt' }, () => {
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
        codeBasedEvaluator,
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
});
