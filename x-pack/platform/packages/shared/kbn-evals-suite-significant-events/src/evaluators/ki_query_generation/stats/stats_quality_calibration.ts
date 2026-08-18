/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveQueryType } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { ExistingQuerySummary } from '@kbn/streams-ai';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { KIQueryGenerationEvaluationExample, KIQueryGenerationOutput, Query } from '../types';
import { getQueriesFromOutput } from '../types';

interface StatsQualityCalibrationPayload {
  generated: { stats_queries: Query[]; match_queries: Query[] };
  existing_queries: ExistingQuerySummary[];
}

const STATS_QUALITY_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'baseline_calibration',
    text: 'Each query in `generated.stats_queries` should ground the metric in dataset_analysis baselines (typical rates, volumes, or latencies) so responders know what "normal" looks like. Do not require breach thresholds; change-point detection replaces them.',
    score: 1,
  },
  {
    id: 'signal_diversity',
    text: 'Each query in `generated.stats_queries` should cover a distinct failure dimension (error rate, latency, auth failures, traffic volume). Overlapping signals should be consolidated.',
    score: 1,
  },
  {
    id: 'detection_evidence_pairing',
    text: 'The output has `generated.stats_queries`, `generated.match_queries`, and `existing_queries`. Each signal covered by a STATS metric-series query (continuous bucket + metric_value for change-point) should have a complementary match query for evidence retrieval, satisfied by either `generated.match_queries` or an equivalent entry in `existing_queries` for the same signal. Judge pairing by signal, not by count. Do not require a STATS query for match-only signals.',
    score: 1,
  },
];

const getStatsQueries = (output: KIQueryGenerationOutput): Query[] => {
  const queries = getQueriesFromOutput(output);
  return queries.filter((q: Query) => deriveQueryType(q.esql) === QUERY_TYPE_STATS);
};

// `deriveQueryType` returns only 'match' | 'stats', so `!== QUERY_TYPE_STATS` is exactly the match set.
const getMatchQueries = (output: KIQueryGenerationOutput): Query[] =>
  getQueriesFromOutput(output).filter((q: Query) => deriveQueryType(q.esql) !== QUERY_TYPE_STATS);

// Rerun arms seed `existing_queries` on the example input (see build_query_gen_examples.ts);
// the task output carries only `evaluation_arm`, not the seeds.
const getExistingQueries = (input: unknown): ExistingQuerySummary[] => {
  if (!input || typeof input !== 'object') {
    return [];
  }
  const existing = (input as { existing_queries?: unknown }).existing_queries;
  return Array.isArray(existing) ? (existing as ExistingQuerySummary[]) : [];
};

/**
 * LLM-judge evaluator that checks the quality of STATS metric-series queries:
 * baseline calibration, signal diversity, and detection+evidence pairing.
 *
 * Short-circuits with `score: null` when no STATS queries are present.
 * Analogous to `confidence_calibration` in feature extraction.
 */
export const createStatsQualityCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
}): Evaluator<KIQueryGenerationEvaluationExample, KIQueryGenerationOutput> =>
  createScenarioCriteriaLlmEvaluator<
    KIQueryGenerationEvaluationExample,
    KIQueryGenerationOutput,
    StatsQualityCalibrationPayload
  >({
    name: 'stats_quality_calibration',
    criteriaFn: (c) =>
      criteriaFn(c) as Evaluator<
        KIQueryGenerationEvaluationExample,
        StatsQualityCalibrationPayload
      >,
    criteria: STATS_QUALITY_CRITERIA,
    skipWhen: (output) =>
      getStatsQueries(output).length === 0 ? 'No STATS queries to evaluate' : undefined,
    transformOutput: (output, { input }) => ({
      generated: {
        stats_queries: getStatsQueries(output),
        // Filtering these out was what made detection_evidence_pairing unanswerable.
        match_queries: getMatchQueries(output),
      },
      // Rerun arms legitimately SKIP a complement that already exists; without the seeds the
      // criterion would penalise correct deduplication.
      existing_queries: getExistingQueries(input),
    }),
  });
