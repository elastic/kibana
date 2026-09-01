/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ANALYSIS_SIGNAL_GROUPS, MAX_GROUP_SIGNAL_IDS } from '../../common/constants';
import type { SignalPatternGroup } from '../../common/http_api/feedback_context';
import type { Signal } from '../../common/http_api/signals';

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

const GROUP_KEY_SEPARATOR = '\u0000';

interface GroupAccumulator {
  tag: string;
  targetIndex: string;
  tool: string;
  signalIds: string[];
  count: number;
  example?: SignalPatternGroup['example'];
}

const toExample = (signal: Signal): SignalPatternGroup['example'] => ({
  ...(signal.data.query !== undefined ? { query: signal.data.query } : {}),
  ...(signal.data.error !== undefined ? { error: signal.data.error } : {}),
  row_count: signal.data.returned.row_count,
  ...(signal.data.conversation_id !== undefined
    ? { conversation_id: signal.data.conversation_id }
    : {}),
});

/**
 * Folds the selected signals into ranked patterns.
 *
 * A signal contributes to one group per tag it carries, because the tags are separate axes: a
 * query that both errored and hit raw data is evidence of two different problems with two
 * different fixes. Untagged signals are counted nowhere — a retrieval that worked is not a pattern
 * to act on, and including it would dilute the ranking with the healthy case.
 */
export const groupSignals = (signals: Signal[]): SignalPatternGroup[] => {
  const accumulators = new Map<string, GroupAccumulator>();

  for (const signal of signals) {
    for (const tag of signal.tags) {
      const targetIndex = signal.data.target_index;
      const { tool } = signal.data;
      const key = [tag, targetIndex, tool].join(GROUP_KEY_SEPARATOR);

      let accumulator = accumulators.get(key);
      if (!accumulator) {
        accumulator = { tag, targetIndex, tool, signalIds: [], count: 0 };
        accumulators.set(key, accumulator);
      }

      accumulator.count += 1;
      if (accumulator.signalIds.length < MAX_GROUP_SIGNAL_IDS) {
        accumulator.signalIds.push(signal.signal_id);
      }
      // Prefer an example that carries an error message: for a `query_error` group the message is
      // the finding, and the first signal in the group may not have one.
      if (!accumulator.example || (!accumulator.example.error && signal.data.error)) {
        accumulator.example = toExample(signal);
      }
    }
  }

  return [...accumulators.values()]
    .map<SignalPatternGroup>((accumulator) => ({
      tag: accumulator.tag,
      target_index: accumulator.targetIndex,
      tool: accumulator.tool,
      count: accumulator.count,
      score: accumulator.count * (TAG_WEIGHT[accumulator.tag] ?? DEFAULT_TAG_WEIGHT),
      signal_ids: accumulator.signalIds,
      ...(accumulator.example ? { example: accumulator.example } : {}),
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
};
