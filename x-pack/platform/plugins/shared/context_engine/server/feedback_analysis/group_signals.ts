/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ANALYSIS_SIGNAL_GROUPS } from '../../common/constants';
import type { SignalPatternGroup } from '../../common/http_api/feedback_context';
import type { SignalTag } from '../../common/http_api/signals';

/** One (tag, target index, tool) combination found in the window, before ranking. */
export interface SignalPatternCandidate {
  tag: SignalTag;
  target_index: string;
  tool: string;
  count: number;
  signal_ids: string[];
  example?: SignalPatternGroup['example'];
}

/** How strongly each tag indicates a fixable problem, scaling a group's count into its score. */
const TAG_WEIGHT: Record<SignalTag, number> = {
  coverage_gap: 3,
  query_error: 2,
  empty_retrieval: 1.5,
};

/** Ranks the candidate patterns and keeps the ones worth a run's attention. */
export const rankPatterns = (candidates: SignalPatternCandidate[]): SignalPatternGroup[] =>
  candidates
    .filter(({ count }) => count > 0)
    .map<SignalPatternGroup>((candidate) => ({
      tag: candidate.tag,
      target_index: candidate.target_index,
      tool: candidate.tool,
      count: candidate.count,
      score: candidate.count * TAG_WEIGHT[candidate.tag],
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
