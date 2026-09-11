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

/**
 * Returns deduplicated, sorted K values. IR_EVAL_K (or the deprecated RAG_EVAL_K) takes
 * precedence over the passed `k`. Use this when composing individual `create*AtKEvaluator`
 * factories directly so the env var override still applies.
 */
export function getEffectiveK(k: number | number[]): number[] {
  let kValues: number[];
  if (process.env.IR_EVAL_K !== undefined) {
    kValues = parseIrEvalKEnvVar(process.env.IR_EVAL_K, 'IR_EVAL_K');
  } else if (process.env.RAG_EVAL_K !== undefined) {
    kValues = parseIrEvalKEnvVar(process.env.RAG_EVAL_K, 'RAG_EVAL_K');
  } else {
    kValues = Array.isArray(k) ? k : [k];
  }
  const result = [...new Set(kValues)].sort((a, b) => a - b);
  if (result.length === 0) {
    throw new Error('k must be a positive integer or a non-empty array of positive integers');
  }
  return result;
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
  k: number,
  output: TOutput,
  referenceOutput: TReferenceOutput
): IrMetrics | null {
  const { extractRetrievedDocs, extractGroundTruth } = config;
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
  const map = calculateMap(relevantFlags, totalRelevant);

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
  k: number,
  spec: IrMetricSpec
): Evaluator {
  return {
    name: spec.name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      let metrics: IrMetrics | null;
      try {
        metrics = computeIrMetrics(config, k, output as TOutput, expected as TReferenceOutput);
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
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
 * MAP@K: average precision at each relevant hit in the top K, normalized by the total
 * relevant docs in ground truth. The mean across all examples yields Mean Average Precision.
 */
export function createMapAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number
): Evaluator {
  return createIrMetricEvaluator(config, k, {
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
 * Evaluators are created for each K value. IR_EVAL_K (or the deprecated RAG_EVAL_K) takes
 * precedence over `k`. For example, k: [5, 10] creates Precision@5 ... MAP@5, Precision@10 ... MAP@10.
 */
export function createIrEvaluators<TOutput = unknown, TReferenceOutput = unknown>(
  config: IrEvaluatorConfig<TOutput, TReferenceOutput>,
  k: number | number[]
): Evaluator[] {
  return getEffectiveK(k).flatMap((kValue) => [
    createPrecisionAtKEvaluator(config, kValue),
    createRecallAtKEvaluator(config, kValue),
    createF1AtKEvaluator(config, kValue),
    createHitRateAtKEvaluator(config, kValue),
    createMrrAtKEvaluator(config, kValue),
    createNdcgAtKEvaluator(config, kValue),
    createMapAtKEvaluator(config, kValue),
  ]);
}

/** @deprecated Use {@link createIrEvaluators} instead. */
export const createRagEvaluators = createIrEvaluators;
