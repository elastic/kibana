/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator } from '../../types';
import type { IrEvaluatorConfig, GroundTruth, RetrievedDoc } from './types';
import {
  DEFAULT_RELEVANCE_THRESHOLD,
  isRelevant,
  getRelevantDocs,
  countRelevantInGroundTruth,
  calculatePrecision,
  calculateRecall,
  calculateF1,
  calculateHitRate,
  calculateMrr,
  calculateNdcg,
  calculateMap,
  dedupeDocs,
  getRelevanceGain,
  getIdealGains,
  filterDocsByGroundTruthIndices,
} from './metrics';

function shouldFilterByGroundTruthIndices(config: {
  filterByGroundTruthIndices?: boolean;
}): boolean {
  if (config.filterByGroundTruthIndices !== undefined) {
    return config.filterByGroundTruthIndices;
  }
  return (process.env.INDEX_FOCUSED_IR_EVAL ?? process.env.INDEX_FOCUSED_RAG_EVAL) === 'true';
}

/**
 * Parses and validates a K env var value. Throws if any value is invalid.
 */
function parseIrEvalKEnvVar(envK: string, envVarName: string): number[] {
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
      `Invalid ${envVarName} value(s): ${invalidValues.map((v) => `"${v}"`).join(', ')}. ` +
        `All values must be positive integers. Got: ${envVarName}="${envK}"`
    );
  }

  return parsedValues;
}

/** Returns K values from the IR_EVAL_K env var (falling back to the deprecated RAG_EVAL_K) or config. */
function getEffectiveK(configK: number | number[]): number[] {
  if (process.env.IR_EVAL_K !== undefined) {
    return parseIrEvalKEnvVar(process.env.IR_EVAL_K, 'IR_EVAL_K');
  }
  if (process.env.RAG_EVAL_K !== undefined) {
    return parseIrEvalKEnvVar(process.env.RAG_EVAL_K, 'RAG_EVAL_K');
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

interface IrMetrics {
  precision: number;
  recall: number;
  f1: number;
  hitRate: number;
  mrr: number;
  ndcg: number;
  map: number;
  hits: number;
  k: number;
  totalRelevant: number;
  /** 1-indexed rank of the first relevant doc in the top K, or null when there is none */
  firstRelevantRank: number | null;
}

function computeIrMetrics<TOutput, TReferenceOutput>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  output: TOutput,
  referenceOutput: TReferenceOutput
): IrMetrics | null {
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

  // Deduplicate before the top-K cutoff so ranks are positions of unique docs
  const topKDocs = dedupeDocs(allRetrievedDocs).slice(0, k);
  const relevantFlags = topKDocs.map((doc) => isRelevant(doc, groundTruth, threshold));
  const hits = getRelevantDocs(topKDocs, groundTruth, threshold).length;
  const totalRelevant = countRelevantInGroundTruth(groundTruth, threshold);

  const precision = calculatePrecision(hits, k);
  const recall = calculateRecall(hits, totalRelevant);
  const f1 = calculateF1(precision, recall);
  const hitRate = calculateHitRate(hits);
  const mrr = calculateMrr(relevantFlags);
  const map = calculateMap(relevantFlags, k, totalRelevant);

  const gains = topKDocs.map((doc) => getRelevanceGain(doc, groundTruth, threshold));
  const ndcg = calculateNdcg(gains, getIdealGains(groundTruth, threshold, k));

  const firstRelevantIndex = relevantFlags.indexOf(true);
  const firstRelevantRank = firstRelevantIndex === -1 ? null : firstRelevantIndex + 1;

  return {
    precision,
    recall,
    f1,
    hitRate,
    mrr,
    ndcg,
    map,
    hits,
    k,
    totalRelevant,
    firstRelevantRank,
  };
}

interface IrMetricSpec {
  name: string;
  getResult: (metrics: IrMetrics) => EvaluationResult;
}

/**
 * Wraps metric computation into an Evaluator, handling extractor errors and
 * missing ground truth uniformly ({ score: null, label: 'unavailable' }).
 */
function createIrMetricEvaluator<TOutput, TReferenceOutput>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  spec: IrMetricSpec
): Evaluator {
  return {
    name: spec.name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      let metrics: IrMetrics | null;
      try {
        metrics = computeIrMetrics(config, output as TOutput, expected as TReferenceOutput);
      } catch (error) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `${spec.name} evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (!metrics) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `No ground truth available for ${spec.name} evaluation`,
        };
      }

      return spec.getResult(metrics);
    },
  };
}

export function createPrecisionAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `Precision@${k}`,
    getResult: (metrics) => ({
      score: metrics.precision,
      explanation: `${metrics.hits} relevant docs in top ${metrics.k} (Precision: ${(
        metrics.precision * 100
      ).toFixed(1)}%)`,
      metadata: { hits: metrics.hits, k: metrics.k },
    }),
  });
}

export function createRecallAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `Recall@${k}`,
    getResult: (metrics) => ({
      score: metrics.recall,
      explanation: `${metrics.hits} of ${metrics.totalRelevant} relevant docs retrieved (Recall: ${(
        metrics.recall * 100
      ).toFixed(1)}%)`,
      metadata: { hits: metrics.hits, totalRelevant: metrics.totalRelevant },
    }),
  });
}

export function createF1AtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `F1@${k}`,
    getResult: (metrics) => ({
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
    }),
  });
}

/**
 * HitRate@K (also known as Accuracy@K): 1 if at least one relevant doc is in the top K, else 0.
 */
export function createHitRateAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `HitRate@${k}`,
    getResult: (metrics) => ({
      score: metrics.hitRate,
      explanation: `HitRate@${metrics.k}: ${
        metrics.hitRate === 1
          ? `found a relevant doc in top ${metrics.k}`
          : `no relevant docs in top ${metrics.k}`
      }`,
      metadata: { hits: metrics.hits, k: metrics.k },
    }),
  });
}

/**
 * MRR@K: reciprocal rank of the first relevant doc in the top K (0 when there is none).
 * The mean across all examples yields the suite-level Mean Reciprocal Rank.
 */
export function createMrrAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `MRR@${k}`,
    getResult: (metrics) => ({
      score: metrics.mrr,
      explanation: `MRR@${metrics.k}: ${metrics.mrr.toFixed(3)}${
        metrics.firstRelevantRank !== null
          ? ` (first relevant doc at rank ${metrics.firstRelevantRank})`
          : ` (no relevant docs in top ${metrics.k})`
      }`,
      metadata: { firstRelevantRank: metrics.firstRelevantRank, k: metrics.k },
    }),
  });
}

/**
 * NDCG@K: ranking quality vs the ideal ordering of all relevant ground-truth docs,
 * using graded relevance (ground-truth scores as gains).
 */
export function createNdcgAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `NDCG@${k}`,
    getResult: (metrics) => ({
      score: metrics.ndcg,
      explanation: `NDCG@${metrics.k}: ${metrics.ndcg.toFixed(
        3
      )} (ranking quality vs ideal ordering)`,
      metadata: { k: metrics.k },
    }),
  });
}

/**
 * MAP@K: average precision at each relevant hit in the top K, normalized by
 * min(K, total relevant docs). The mean across all examples yields Mean Average Precision.
 */
export function createMapAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator {
  const k = getSingleK(config.k);
  return createIrMetricEvaluator(config, {
    name: `MAP@${k}`,
    getResult: (metrics) => ({
      score: metrics.map,
      explanation: `MAP@${metrics.k}: ${metrics.map.toFixed(3)} (${metrics.hits} of ${
        metrics.totalRelevant
      } relevant docs retrieved)`,
      metadata: { hits: metrics.hits, k: metrics.k, totalRelevant: metrics.totalRelevant },
    }),
  });
}

/**
 * Creates all IR evaluators (Precision@K, Recall@K, F1@K, HitRate@K, MRR@K, NDCG@K, MAP@K)
 * with shared configuration.
 * `extractRetrievedDocs` must return docs ordered best match first: MRR, NDCG, and MAP derive
 * each doc's rank from its array position.
 * When k is an array or IR_EVAL_K (or the deprecated RAG_EVAL_K) contains comma-separated
 * values, evaluators are created for each K value.
 * For example, k: [5, 10] will create Precision@5 ... MAP@5, Precision@10 ... MAP@10.
 */
export function createIrEvaluators<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>
): Evaluator[] {
  const kValues = normalizeKValues(config.k);

  return kValues.flatMap((kValue) => [
    createPrecisionAtKEvaluator({ ...config, k: kValue }),
    createRecallAtKEvaluator({ ...config, k: kValue }),
    createF1AtKEvaluator({ ...config, k: kValue }),
    createHitRateAtKEvaluator({ ...config, k: kValue }),
    createMrrAtKEvaluator({ ...config, k: kValue }),
    createNdcgAtKEvaluator({ ...config, k: kValue }),
    createMapAtKEvaluator({ ...config, k: kValue }),
  ]);
}

/** @deprecated Use {@link createIrEvaluators} instead. */
export const createRagEvaluators = createIrEvaluators;
