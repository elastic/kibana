/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '../../types';
import type { RagEvaluatorConfig, GroundTruth, RetrievedDoc } from './types';
import {
  DEFAULT_RELEVANCE_THRESHOLD,
  getRelevantDocs,
  countRelevantInGroundTruth,
  calculatePrecision,
  calculateRecall,
  calculateF1,
  filterDocsByGroundTruthIndices,
} from './metrics';

const PRECISION_EVALUATOR_NAME = 'Precision@K';
const RECALL_EVALUATOR_NAME = 'Recall@K';
const F1_EVALUATOR_NAME = 'F1@K';

function shouldFilterByGroundTruthIndices(config: {
  filterByGroundTruthIndices?: boolean;
}): boolean {
  if (config.filterByGroundTruthIndices !== undefined) {
    return config.filterByGroundTruthIndices;
  }
  return process.env.INDEX_FOCUSED_RAG_EVAL === 'true';
}

function getEffectiveK(configK: number): number {
  const envK = process.env.RAG_EVAL_K;
  if (envK !== undefined) {
    const parsed = parseInt(envK, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return configK;
}

interface RagMetrics {
  precision: number;
  recall: number;
  f1: number;
  hits: number;
  k: number;
  totalRelevant: number;
}

function computeRagMetrics<TOutput, TReferenceOutput>(
  config: RagEvaluatorConfig<TOutput, TReferenceOutput>,
  output: TOutput,
  referenceOutput: TReferenceOutput
): RagMetrics | null {
  const { extractRetrievedDocs, extractGroundTruth } = config;
  const k = getEffectiveK(config.k);
  const threshold = config.relevanceThreshold ?? DEFAULT_RELEVANCE_THRESHOLD;

  const groundTruth: GroundTruth = extractGroundTruth(referenceOutput);
  if (!groundTruth || Object.keys(groundTruth).length === 0) {
    return null;
  }

  let allRetrievedDocs: RetrievedDoc[] = extractRetrievedDocs(output);

  if (shouldFilterByGroundTruthIndices(config)) {
    allRetrievedDocs = filterDocsByGroundTruthIndices(allRetrievedDocs, groundTruth);
  }

  const topKDocs = allRetrievedDocs.slice(0, k);
  const relevantInTopK = getRelevantDocs(topKDocs, groundTruth, threshold);
  const hits = relevantInTopK.length;
  const totalRelevant = countRelevantInGroundTruth(groundTruth, threshold);

  const precision = calculatePrecision(hits, k);
  const recall = calculateRecall(hits, totalRelevant);
  const f1 = calculateF1(precision, recall);

  return { precision, recall, f1, hits, k, totalRelevant };
}

export function createPrecisionAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: RagEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  return {
    name: PRECISION_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      let metrics: RagMetrics | null;
      try {
        metrics = computeRagMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `Precision@K evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No ground truth available for Precision@K evaluation',
        };
      }

      return {
        score: metrics.precision,
        explanation: `${metrics.hits} relevant docs in top ${metrics.k} (Precision: ${(
          metrics.precision * 100
        ).toFixed(1)}%)`,
        metadata: { hits: metrics.hits, k: metrics.k },
      };
    },
  };
}

export function createRecallAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: RagEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  return {
    name: RECALL_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      let metrics: RagMetrics | null;
      try {
        metrics = computeRagMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `Recall@K evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No ground truth available for Recall@K evaluation',
        };
      }

      return {
        score: metrics.recall,
        explanation: `${metrics.hits} of ${
          metrics.totalRelevant
        } relevant docs retrieved (Recall: ${(metrics.recall * 100).toFixed(1)}%)`,
        metadata: { hits: metrics.hits, totalRelevant: metrics.totalRelevant },
      };
    },
  };
}

export function createF1AtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: RagEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  return {
    name: F1_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      let metrics: RagMetrics | null;
      try {
        metrics = computeRagMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `F1@K evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No ground truth available for F1@K evaluation',
        };
      }

      return {
        score: metrics.f1,
        explanation: `F1@${metrics.k}: ${(metrics.f1 * 100).toFixed(1)}% (P: ${(
          metrics.precision * 100
        ).toFixed(1)}%, R: ${(metrics.recall * 100).toFixed(1)}%)`,
        metadata: {
          precision: metrics.precision,
          recall: metrics.recall,
          hits: metrics.hits,
          k: metrics.k,
          totalRelevant: metrics.totalRelevant,
        },
      };
    },
  };
}

/**
 * Creates all RAG evaluators (Precision@K, Recall@K, F1@K) with shared configuration.
 */
export function createRagEvaluators<TOutput = unknown, TReferenceOutput = unknown>(
  config: RagEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator[] {
  return [
    createPrecisionAtKEvaluator(config),
    createRecallAtKEvaluator(config),
    createF1AtKEvaluator(config),
  ];
}
