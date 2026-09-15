/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionSummary, TimelineEvent } from '@kbn/agent-builder-common';
import { groupTimelineRounds, type ProcessedTimelineEvent } from './context_timeline';

type LegacyCompactionSummary = Omit<CompactionSummary, 'summarized_up_to_event_id'> & {
  summarized_round_count: number;
};

const isLegacy = (
  summary: CompactionSummary | LegacyCompactionSummary
): summary is LegacyCompactionSummary => 'summarized_round_count' in summary;

/** Read-time translation of pre-cursor summaries. Persisted documents are never rewritten. */
export const toCursorSummary = (
  summary: CompactionSummary | LegacyCompactionSummary | undefined,
  timeline: Array<TimelineEvent | ProcessedTimelineEvent>
): CompactionSummary | undefined => {
  if (!summary) return undefined;
  if (!isLegacy(summary)) return summary;
  const { summarized_round_count: count, ...rest } = summary;
  const rounds = groupTimelineRounds(timeline);
  const lastCovered = rounds[count - 1];
  if (!lastCovered) return undefined;
  return {
    ...rest,
    summarized_up_to_event_id: lastCovered.events[lastCovered.events.length - 1].id,
  };
};
