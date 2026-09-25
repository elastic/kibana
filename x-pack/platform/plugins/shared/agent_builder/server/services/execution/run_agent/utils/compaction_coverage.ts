/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionSummary, TimelineEvent } from '@kbn/agent-builder-common';
import { TimelineEventType, parseExecutionId } from '@kbn/agent-builder-common';

/**
 * Ids of the rounds the pre-change fold would have formed: those whose initial execution
 * (`exec_0`) has an `execution_terminated`, whatever later executions did. A paused `exec_0`
 * followed by an interrupted resume was a round then (awaiting_prompt) and is one now
 * (interrupted); an interrupted `exec_0` was invisible. Decided on raw events — the folded context
 * timeline re-serialises a resumed round with its last terminal and cannot tell the two apart.
 */
export const legacyEligibleRoundIds = (events: TimelineEvent[]): Set<string> => {
  const eligible = new Set<string>();
  for (const event of events) {
    if (event.type !== TimelineEventType.executionTerminated || !event.execution_id) {
      continue;
    }
    const parsed = parseExecutionId(event.execution_id) ?? {
      roundId: event.execution_id,
      index: 0,
    };
    if (parsed.index === 0) {
      eligible.add(parsed.roundId);
    }
  }
  return eligible;
};

/** True for a summary written before coverage became a set of round ids. */
export const isLegacySummary = (summary: CompactionSummary): boolean =>
  summary.covered_round_ids === undefined;

/**
 * The rounds a summary covers. With `covered_round_ids`: those ids ∩ the current rounds (a
 * removed round drops out, nothing else moves). Legacy: the first `summarized_round_count`
 * rounds, in round order, that the pre-change fold would have formed (`legacyEligibleIds`).
 */
export const coveredRoundIds = ({
  summary,
  rounds,
  legacyEligibleIds,
}: {
  summary: CompactionSummary | undefined;
  rounds: ReadonlyArray<{ id: string }>;
  legacyEligibleIds: ReadonlySet<string>;
}): Set<string> => {
  if (!summary) {
    return new Set();
  }
  if (summary.covered_round_ids) {
    const current = new Set(rounds.map((round) => round.id));
    return new Set(summary.covered_round_ids.filter((id) => current.has(id)));
  }
  const covered = new Set<string>();
  for (const round of rounds) {
    if (covered.size >= summary.summarized_round_count) {
      break;
    }
    if (legacyEligibleIds.has(round.id)) {
      covered.add(round.id);
    }
  }
  return covered;
};

/**
 * True when a round the summary never covered sits before the last covered one in round order:
 * the summarised prefix hides unsummarised content, so the summary must be rebuilt.
 */
export const hasUncoveredPrefixRounds = (
  rounds: ReadonlyArray<{ id: string }>,
  covered: ReadonlySet<string>
): boolean => {
  let lastCoveredIndex = -1;
  rounds.forEach((round, index) => {
    if (covered.has(round.id)) {
      lastCoveredIndex = index;
    }
  });
  return rounds.slice(0, lastCoveredIndex).some((round) => !covered.has(round.id));
};

/**
 * The longest oldest-first prefix of `rounds` whose token sum stays within `budget`. Always takes
 * the first round when any remain, even when it alone exceeds the budget (the caller decides what
 * to do with an oversized round).
 */
export const takeRoundsWithinBudget = <R extends { id: string }>(
  rounds: R[],
  tokensByRoundId: ReadonlyMap<string, number>,
  budget: number
): R[] => {
  const taken: R[] = [];
  let total = 0;
  for (const round of rounds) {
    const tokens = tokensByRoundId.get(round.id) ?? 0;
    if (taken.length > 0 && total + tokens > budget) {
      break;
    }
    taken.push(round);
    total += tokens;
  }
  return taken;
};
