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

const getPrecisionName = (k: number) => `Precision@${k}`;
const getRecallName = (k: number) => `Recall@${k}`;
const getF1Name = (k: number) => `F1@${k}`;

function shouldFilterByGroundTruthIndices(config: {
  filterByGroundTruthIndices?: boolean;
}): boolean {
  if (config.filterByGroundTruthIndices !== undefined) {
    return config.filterByGroundTruthIndices;
  }
  return process.env.INDEX_FOCUSED_RAG_EVAL === 'true';
}

/**
 * Parses and validates RAG_EVAL_K env var. Throws if any value is invalid.
 */
function parseRagEvalKEnvVar(envK: string): number[] {
  const rawValues = envK.split(',').map((v) => v.trim());
  const invalidValues: string[] = [];
  const parsedValues: number[] = [];

  for (const raw of rawValues) {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed <= 0 || String(parsed) !== raw) {
      invalidValues.push(raw);
    } else {
      parsedValues.push(parsed);
    }
  }

  if (invalidValues.length > 0) {
    throw new Error(
      `Invalid RAG_EVAL_K value(s): ${invalidValues.map((v) => `"${v}"`).join(', ')}. ` +
        `All values must be positive integers. Got: RAG_EVAL_K="${envK}"`
    );
  }

  return parsedValues;
}

/** Returns K values from RAG_EVAL_K env var (comma-separated) or config. */
function getEffectiveK(configK: number | number[]): number[] {
  const envK = process.env.RAG_EVAL_K;
  if (envK !== undefined) {
    return parseRagEvalKEnvVar(envK);
  }
  return Array.isArray(configK) ? configK : [configK];
}

/**
 * Normalizes K values by removing duplicates and sorting in ascending order.
 */
function normalizeKValues(configK: number | number[]): number[] {
  const kValues = getEffectiveK(configK);
  return [...new Set(kValues)].sort((a, b) => a - b);
}

/**
 * Returns a single K value. Uses the number directly or first value from array.
 */
function getSingleK(configK: number | number[]): number {
  if (typeof configK === 'number') {
    return configK;
  }
  const kValues = getEffectiveK(configK);
  return kValues[0];
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
  const k = getSingleK(config.k);
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
  const k = getSingleK(config.k);
  return {
    name: getPrecisionName(k),
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      let metrics: RagMetrics | null;
      try {
        metrics = computeRagMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `Precision@${k} evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `No ground truth available for Precision@${k} evaluation`,
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
  const k = getSingleK(config.k);
  return {
    name: getRecallName(k),
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      let metrics: RagMetrics | null;
      try {
        metrics = computeRagMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `Recall@${k} evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `No ground truth available for Recall@${k} evaluation`,
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
  const k = getSingleK(config.k);
  return {
    name: getF1Name(k),
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      let metrics: RagMetrics | null;
      try {
        metrics = computeRagMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `F1@${k} evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `No ground truth available for F1@${k} evaluation`,
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
 * When k is an array or RAG_EVAL_K contains comma-separated values, evaluators are created for each K value.
 * For example, k: [5, 10] will create: Precision@5, Recall@5, F1@5, Precision@10, Recall@10, F1@10
 */
export function createRagEvaluators<TOutput = unknown, TReferenceOutput = unknown>(
  config: RagEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator[] {
  const kValues = normalizeKValues(config.k);

  return kValues.flatMap((kValue) => [
    createPrecisionAtKEvaluator({ ...config, k: kValue }),
    createRecallAtKEvaluator({ ...config, k: kValue }),
    createF1AtKEvaluator({ ...config, k: kValue }),
  ]);
}
