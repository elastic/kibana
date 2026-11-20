/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  buildSpaceFilter,
  type ReviewQueueSampleStrategy,
  type ReviewQueueSourceFilter,
} from '@kbn/evals-common';
import type { EvaluationScoreService } from '../../storage/scores/evaluation_score_service';
import type { OnlineScoreService } from '../../storage/scores/online_score_service';
import type { NewReviewItem } from '../../storage/reviews/review_client';

/** The most recent scores considered per sample, so one request never scans an unbounded history. */
export const MAX_SAMPLE_CANDIDATES = 5000;

/** A judge score eligible for review, before it is given a queue position. */
export type SampleCandidate = Omit<NewReviewItem, 'position' | 'queue_id' | 'evaluator'>;

export interface SampleScoresParams {
  evaluationScoreService: EvaluationScoreService;
  onlineScoreService: OnlineScoreService;
  queueId: string;
  spaceId: string;
  sourceFilter: ReviewQueueSourceFilter;
  evaluator: { name: string; version: string };
  sampleSize: number;
  strategy: ReviewQueueSampleStrategy;
  random?: () => number;
}

interface ExperimentScoreSource {
  example?: { id?: string };
  task?: { trace_id?: string; repetition_index?: number };
  evaluator?: { score?: number | null; label?: string | null };
}

interface OnlineScoreSource {
  trace_id?: string;
  score?: { value?: number | null; label?: string | null };
}

const scoreOf = (value: number | null | undefined, label: string | null | undefined) => ({
  ...(typeof value === 'number' ? { value } : {}),
  ...(label ? { label } : {}),
});

/** Fisher–Yates over a copy, so the caller's array keeps its order. */
const shuffle = <T>(items: readonly T[], random: () => number): T[] => {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Picks up to `sampleSize` candidates. `uniform` is a simple random sample. `stratified_by_label`
 * draws round-robin across the judge's label values (random within each), so a rare label is
 * represented instead of being drowned out by the majority one.
 */
export const selectSample = (
  candidates: readonly SampleCandidate[],
  sampleSize: number,
  strategy: ReviewQueueSampleStrategy,
  random: () => number = Math.random
): SampleCandidate[] => {
  const shuffled = shuffle(candidates, random);
  if (strategy === 'uniform') {
    return shuffled.slice(0, sampleSize);
  }

  const strata = new Map<string, SampleCandidate[]>();
  for (const candidate of shuffled) {
    const key = candidate.score.label ?? '';
    strata.set(key, [...(strata.get(key) ?? []), candidate]);
  }

  const queues = shuffle([...strata.values()], random);
  const picked: SampleCandidate[] = [];
  while (picked.length < sampleSize && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < sampleSize) {
        picked.push(next);
      }
    }
  }
  return picked;
};

const fetchExperimentCandidates = async ({
  evaluationScoreService,
  spaceId,
  sourceFilter,
  evaluator,
}: SampleScoresParams): Promise<SampleCandidate[]> => {
  const filter: QueryDslQueryContainer[] = [
    buildSpaceFilter(spaceId),
    { term: { 'evaluator.name': evaluator.name } },
    { term: { 'evaluator.version': evaluator.version } },
    { exists: { field: 'task.trace_id' } },
  ];
  if (sourceFilter.experiment_id) {
    filter.push({ term: { experiment_id: sourceFilter.experiment_id } });
  }

  const response = await evaluationScoreService.search({
    size: MAX_SAMPLE_CANDIDATES,
    track_total_hits: false,
    _source: [
      'experiment_id',
      'example.id',
      'task.trace_id',
      'task.repetition_index',
      'evaluator.score',
      'evaluator.label',
    ],
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: { bool: { filter } },
  });

  return response.hits.hits.flatMap((hit) => {
    const source = hit._source as (ExperimentScoreSource & { experiment_id?: string }) | undefined;
    const traceId = source?.task?.trace_id;
    if (!source || !traceId) {
      return [];
    }
    return [
      {
        source: {
          source: 'experiment' as const,
          experiment_id: source.experiment_id,
          example_id: source.example?.id,
          repetition_index: source.task?.repetition_index,
          trace_id: traceId,
        },
        score: scoreOf(source.evaluator?.score, source.evaluator?.label),
      },
    ];
  });
};

const fetchOnlineCandidates = async ({
  onlineScoreService,
  spaceId,
  sourceFilter,
  evaluator,
}: SampleScoresParams): Promise<SampleCandidate[]> => {
  const filter: QueryDslQueryContainer[] = [
    buildSpaceFilter(spaceId),
    { term: { 'evaluator.name': evaluator.name } },
    { term: { 'evaluator.version': evaluator.version } },
    { exists: { field: 'trace_id' } },
  ];
  if (sourceFilter.monitor_id) {
    filter.push({ term: { 'monitor.id': sourceFilter.monitor_id } });
  }

  const response = await onlineScoreService.search({
    size: MAX_SAMPLE_CANDIDATES,
    track_total_hits: false,
    _source: ['monitor.id', 'trace_id', 'score.value', 'score.label'],
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: { bool: { filter } },
  });

  return response.hits.hits.flatMap((hit) => {
    const source = hit._source as (OnlineScoreSource & { monitor?: { id?: string } }) | undefined;
    if (!source?.trace_id) {
      return [];
    }
    return [
      {
        source: {
          source: 'online' as const,
          monitor_id: source.monitor?.id,
          trace_id: source.trace_id,
        },
        score: scoreOf(source.score?.value, source.score?.label),
      },
    ];
  });
};

/**
 * Samples judge scores for a queue from the experiment or online score store, scoped to the
 * space, the evaluator and its version. Scores with no trace are skipped: a reviewer needs the
 * trace to judge the output.
 */
export const sampleScores = async (params: SampleScoresParams): Promise<NewReviewItem[]> => {
  const candidates =
    params.sourceFilter.source === 'online'
      ? await fetchOnlineCandidates(params)
      : await fetchExperimentCandidates(params);

  return selectSample(candidates, params.sampleSize, params.strategy, params.random).map(
    (candidate, index) => ({
      ...candidate,
      queue_id: params.queueId,
      position: index,
      evaluator: params.evaluator,
    })
  );
};
