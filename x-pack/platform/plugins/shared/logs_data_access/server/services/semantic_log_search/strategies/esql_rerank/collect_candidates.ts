/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy, uniqBy } from 'lodash';
import { getSampleProbability } from '@kbn/ml-random-sampler-utils';
import type {
  LogPattern,
  SemanticLogSearchParams,
} from '../../../../../common/services/semantic_log_search/types';
import { NOISE_FRACTION_DEFAULT } from '../../constants';
import type { EsqlSearchScope } from './run_queries';
import { runCategorizePass } from './run_queries';

// Target document count per CATEGORIZE pass. Caps the scan cost so it scales with this constant, not with corpus size.
// https://github.com/elastic/kibana/blob/58b8b4792828/x-pack/platform/packages/shared/ml/random_sampler_utils/src/get_sample_probability.ts#L8
const CATEGORIZE_SAMPLE_TARGET = 50_000;

/** Normalize sampled counts back to population estimates. No-op when probability is 1 (no sampling). */
export function normalizeCounts(patterns: LogPattern[], probability: number): LogPattern[] {
  if (probability >= 1) return patterns;
  return patterns.map((pattern) => ({
    ...pattern,
    count: Math.round(pattern.count / probability),
  }));
}

/**
 * Merge head and rare patterns, keeping the higher-count entry for duplicates.
 * https://github.com/elastic/kibana/blob/d660eae7883a/x-pack/platform/packages/shared/kbn-ai-tools/src/utils/esql_categorize.ts#L232
 */
export function mergeAndDedupe(head: LogPattern[], rare: LogPattern[]): LogPattern[] {
  return uniqBy(
    orderBy([...head, ...rare], (pattern) => pattern.count, 'desc'),
    (p) => p.pattern
  );
}

// ~20/80 head/rare split: mirrors the two-pass path's natural distribution at large scale.
const HEAD_SHARE = 0.2;

// Cap the candidate set before inference, keeping both ends of the frequency distribution.
// A positional prefix would silently drop the rare tail on the single-pass path (small corpora ≤ 50 000 docs).
export function selectRerankCandidates(candidates: LogPattern[], limit: number): LogPattern[] {
  if (candidates.length <= limit) return candidates;
  const byCountDesc = orderBy(candidates, (candidate) => candidate.count, 'desc');
  const headQuota = Math.ceil(limit * HEAD_SHARE);
  return [...byCountDesc.slice(0, headQuota), ...byCountDesc.slice(-(limit - headQuota))];
}

/**
 * Collect log-pattern candidates by running one or two CATEGORIZE passes.
 *
 * - Small corpus (≤ 50 000 docs): single unsampled DESC pass, no noise filtering.
 * - Large corpus: two-pass noise-excluding categorization, adapted from
 *   https://github.com/elastic/kibana/blob/d660eae7883a/x-pack/platform/packages/shared/kbn-ai-tools/src/utils/esql_categorize.ts#L128
 *   Differences: adds `first_seen`/`last_seen` aggregations, `?_tstart`/`?_tend` named params, and `LATEST` over `TOP`.
 */
export async function collectCandidates({
  scope,
  total,
  esClient,
  abortSignal,
}: {
  scope: EsqlSearchScope;
  total: number;
  esClient: SemanticLogSearchParams['esClient'];
  abortSignal: AbortSignal | undefined;
}): Promise<LogPattern[]> {
  const samplingProbability = getSampleProbability(total);

  if (samplingProbability >= 1) {
    // Small corpus: one unsampled pass, no noise threshold.
    return runCategorizePass({
      scope,
      exclusionPatterns: [],
      samplingProbability: 1,
      noiseThreshold: 0,
      sortOrder: 'DESC',
      esClient,
      abortSignal,
    });
  }

  // Large corpus — pass 1 (head): sampled, noise-thresholded, high-frequency patterns first.
  // In sampled space a pattern at `noiseFraction` of the corpus appears at
  // `noiseFraction × total × p` docs.
  const noiseThreshold = Math.max(
    1,
    Math.ceil(NOISE_FRACTION_DEFAULT * total * samplingProbability)
  );
  const headPatterns = await runCategorizePass({
    scope,
    exclusionPatterns: [],
    samplingProbability,
    noiseThreshold,
    sortOrder: 'DESC',
    esClient,
    abortSignal,
  });

  if (headPatterns.length === 0) {
    // No head to exclude; run a plain unthresholded DESC pass instead.
    // ASC with no exclusions would keep only the rarest 1 000 rows on the implicit row-cap
    // truncation, discarding all representative patterns.
    const fallbackPatterns = await runCategorizePass({
      scope,
      exclusionPatterns: [],
      samplingProbability,
      noiseThreshold: 0,
      sortOrder: 'DESC',
      esClient,
      abortSignal,
    });
    return normalizeCounts(fallbackPatterns, samplingProbability);
  }

  const normalizedHead = normalizeCounts(headPatterns, samplingProbability);

  // Pass 2 (rare): exclude head patterns, recategorize the residual at near-full probability.
  // Plain single-pass sampling shares the failure mode of `SORT count DESC | LIMIT n` — it
  // systematically drops the rarest categories. `SORT count ASC` preserves the rare tail on
  // ES|QL's row-cap truncation, recovering the incident-case patterns.
  //
  // Skip only when the head was unsampled and consumed the entire corpus — a sampled residual
  // of 0 is an estimate and the rare pass may still recover missed patterns.
  const headDocs = normalizedHead.reduce((sum, p) => sum + p.count, 0);
  const residual = Math.max(0, total - headDocs);

  if (samplingProbability >= 1 && residual === 0) {
    return normalizedHead;
  }

  const exclusionTokens = headPatterns.map((p) => p.pattern).filter((t) => t.length > 0);
  // When the estimated residual is 0, fall back to the corpus size to avoid a full scan.
  // Dividing by 0 would yield probability 1 (unsampled), and an unsampled scan of an unknown
  // residual may exceed the request budget.
  const sampledResidual = residual > 0 ? residual : total;
  const residualProbability =
    sampledResidual > CATEGORIZE_SAMPLE_TARGET ? CATEGORIZE_SAMPLE_TARGET / sampledResidual : 1;

  const rarePatterns = await runCategorizePass({
    scope,
    exclusionPatterns: exclusionTokens,
    samplingProbability: residualProbability,
    noiseThreshold: 0,
    sortOrder: 'ASC',
    esClient,
    abortSignal,
  });

  const normalizedRare = normalizeCounts(rarePatterns, residualProbability);
  return mergeAndDedupe(normalizedHead, normalizedRare);
}
