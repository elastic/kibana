/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { evaluate } from '../src/evaluate';
import type { StreamsEvaluationWorkerFixtures } from '../src/types';
import type {
  FeatureIdentificationEvaluationDataset,
  FeatureIdentificationEvaluationExample,
} from './features_identification_datasets';
import { FEATURE_IDENTIFICATION_DATASETS } from './features_identification_datasets';
import {
  calculateOverallQuality,
  formatMetricsSummary,
  type ExtractedFeature,
  type FeatureQualityMetrics,
} from './features_identification_metrics';

/**
 * Features identification evaluation suite.
 *
 * Tests the quality of feature extraction from log samples using:
 * - Code-based evaluator: Calculates quantitative metrics (schema compliance,
 *   evidence grounding, confidence calibration, deduplication, properties usage)
 * - LLM-based evaluator: Assesses qualitative criteria from dataset definitions
 *
 * @tags @svlOblt
 */

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe('Streams features identification', { tag: '@svlOblt' }, () => {
  // =============================================================================
  // EVALUATORS
  // =============================================================================

  /** Format a number as a percentage string */
  const formatPercent = (n: number): string => `${(n * 100).toFixed(0)}%`;

  /**
   * Code-based evaluator that calculates feature quality metrics.
   *
   * Reports detailed breakdown of:
   * - Schema compliance: Required fields, types, evidence count
   * - Evidence grounding: Verify evidence exists in source logs
   * - Confidence calibration: Inferred vs explicit evidence alignment
   * - Deduplication: No duplicate (type, subtype, properties) tuples
   * - Properties usage: High-cardinality data in meta, not properties
   */
  const codeBasedEvaluator = {
    name: 'feature_quality_metrics',
    kind: 'CODE' as const,
    evaluate: async ({
      output,
    }: {
      output: {
        features: ExtractedFeature[];
        sampleDocuments: Array<Record<string, unknown>>;
      };
    }) => {
      const features = output?.features || [];
      const sampleDocuments = output?.sampleDocuments || [];

      // Handle empty features case - this may be valid for some datasets
      if (features.length === 0) {
        return {
          score: 1.0,
          details: {
            featureCount: 0,
            schemaComplianceRate: 1.0,
            evidenceGroundingRate: 1.0,
            confidenceCalibrationScore: 1.0,
            deduplicationScore: 1.0,
            propertiesUsageScore: 1.0,
          },
          reasoning: 'No features extracted - metrics default to passing',
        };
      }

      const metrics: FeatureQualityMetrics = calculateOverallQuality(features, sampleDocuments);

      // Build issues summary
      const issues: string[] = [];
      if (metrics.schemaComplianceRate < 0.9) {
        issues.push(`Schema compliance: ${formatPercent(metrics.schemaComplianceRate)}`);
      }
      if (metrics.evidenceGroundingRate < 0.8) {
        issues.push(`Evidence grounding: ${formatPercent(metrics.evidenceGroundingRate)}`);
      }
      if (metrics.confidenceCalibrationScore < 0.7) {
        issues.push(`Confidence calibration: ${formatPercent(metrics.confidenceCalibrationScore)}`);
      }
      if (metrics.deduplicationScore < 1.0) {
        issues.push(`Deduplication: ${formatPercent(metrics.deduplicationScore)}`);
      }
      if (metrics.propertiesUsageScore < 0.8) {
        issues.push(`Properties usage: ${formatPercent(metrics.propertiesUsageScore)}`);
      }

      const reasoning =
        issues.length > 0
          ? `Issues: ${issues.join('; ')}. ${metrics.issues.slice(0, 3).join('; ')}`
          : `Good quality: ${formatPercent(metrics.overallQuality)}`;

      return {
        score: metrics.overallQuality,
        details: {
          featureCount: features.length,
          schemaComplianceRate: metrics.schemaComplianceRate,
          evidenceGroundingRate: metrics.evidenceGroundingRate,
          confidenceCalibrationScore: metrics.confidenceCalibrationScore,
          deduplicationScore: metrics.deduplicationScore,
          propertiesUsageScore: metrics.propertiesUsageScore,
          metricsSummary: formatMetricsSummary(metrics),
        },
        reasoning,
      };
    },
  };

  /**
   * LLM-based evaluator using criteria from dataset definitions.
   *
   * Evaluates qualitative aspects like:
   * - Correct feature types and subtypes for the domain
   * - Appropriate confidence levels for evidence quality
   * - Meaningful descriptions and evidence strings
   */
  const createLlmEvaluator = (evaluators: StreamsEvaluationWorkerFixtures['evaluators']) => ({
    name: 'feature_correctness',
    kind: 'LLM' as const,
    evaluate: async ({
      input,
      output,
      expected,
      metadata,
    }: {
      input: FeatureIdentificationEvaluationExample['input'];
      output: { features: ExtractedFeature[]; sampleDocuments: Array<Record<string, unknown>> };
      expected: FeatureIdentificationEvaluationExample['output'];
      metadata: FeatureIdentificationEvaluationExample['metadata'];
    }) => {
      const result = await evaluators.criteria(expected.criteria).evaluate({
        input,
        expected,
        output: output.features,
        metadata,
      });

      return result;
    },
  });

  // =============================================================================
  // EXPERIMENT RUNNER
  // =============================================================================

  /**
   * Run feature identification experiment for a dataset.
   *
   * The task returns both features and input sample documents so the code
   * evaluator can verify evidence grounding against the source logs.
   */
  const runFeatureIdentificationExperiment = async (
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
  ): Promise<void> => {
    await phoenixClient.runExperiment(
      {
        dataset,
        concurrency: 1,
        task: async ({
          input,
        }: {
          input: FeatureIdentificationEvaluationExample['input'];
        }): Promise<{
          features: ExtractedFeature[];
          sampleDocuments: Array<Record<string, unknown>>;
        }> => {
          const { features } = await identifyFeatures({
            sampleDocuments: input.sample_documents,
            systemPrompt: featuresPrompt,
            inferenceClient,
            logger,
            signal: new AbortController().signal,
          });

          // Return both features and input for metrics calculation
          return {
            features: features as ExtractedFeature[],
            sampleDocuments: input.sample_documents,
          };
        },
      },
      // Use both code-based and LLM-based evaluators
      [codeBasedEvaluator, createLlmEvaluator(evaluators)]
    );
  };

  // =============================================================================
  // TEST RUNNER
  // =============================================================================

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
