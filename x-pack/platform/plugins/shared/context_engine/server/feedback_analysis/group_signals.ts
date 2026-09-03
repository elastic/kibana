/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ANALYSIS_SIGNAL_GROUPS } from '../../common/constants';
import type { SignalPatternGroup } from '../../common/http_api/feedback_context';

/**
 * One (tag, target index, tool) combination found in the window, before ranking.
 *
 * {@link count} is the true number of signals in the window carrying that combination, taken from
 * an aggregation rather than from the documents a run happened to read, so ranking does not depend
 * on the sample size. The example and ids are best-effort evidence drawn from that sample.
 */
export interface SignalPatternCandidate {
  tag: string;
  target_index: string;
  tool: string;
  count: number;
  signal_ids: string[];
  example?: SignalPatternGroup['example'];
}

/**
 * How strongly each tag indicates something worth fixing.
 *
 * The issue asks for `frequency × classifier confidence`, but a signal carries no confidence: the
 * classifier is a handful of deterministic rules over the trace, not a model, so every tag it
 * assigns is certain. What differs is how actionable the tag is, and that is what this weights.
 *
 * `coverage_gap` ranks highest because the agent bypassed the AI index altogether — the clearest
 * evidence that something is missing from it. `query_error` next: something is definitely broken,
 * though it may be the query rather than the index. `empty_retrieval` last, because a query that
 * ran correctly and found nothing is often a correct answer about absent data.
 */
const TAG_WEIGHT: Record<string, number> = {
  coverage_gap: 3,
  query_error: 2,
  empty_retrieval: 1.5,
};

const DEFAULT_TAG_WEIGHT = 1;

/**
 * Ranks the candidate patterns and keeps the ones worth a run's attention.
 *
 * A signal contributes to one candidate per tag it carries, because the tags are separate axes: a
 * query that both errored and hit raw data is evidence of two different problems with two
 * different fixes. That fan-out happens in the aggregation, which buckets on the multi-valued
 * `tags` field; untagged signals produce no bucket at all, so a retrieval that worked is never a
 * pattern to act on.
 */
export const rankPatterns = (candidates: SignalPatternCandidate[]): SignalPatternGroup[] =>
  candidates
    .filter(({ count }) => count > 0)
    .map<SignalPatternGroup>((candidate) => ({
      tag: candidate.tag,
      target_index: candidate.target_index,
      tool: candidate.tool,
      count: candidate.count,
      score: candidate.count * (TAG_WEIGHT[candidate.tag] ?? DEFAULT_TAG_WEIGHT),
      signal_ids: candidate.signal_ids,
      ...(candidate.example ? { example: candidate.example } : {}),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.count - a.count ||
        a.tag.localeCompare(b.tag) ||
        a.target_index.localeCompare(b.target_index) ||
        a.tool.localeCompare(b.tool)
    )
    .slice(0, MAX_ANALYSIS_SIGNAL_GROUPS);
