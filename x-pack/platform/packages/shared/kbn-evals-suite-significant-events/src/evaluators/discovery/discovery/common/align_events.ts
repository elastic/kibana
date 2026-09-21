/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';

export const getConfirmedDetectionRuleUuids = (event: {
  signals?: SignificantEvent['signals'];
}): Set<string> =>
  new Set(
    (event.signals ?? []).flatMap((s) =>
      s.type === 'detection' && s.verdict === 'confirms' && s.metadata?.rule_uuid
        ? [s.metadata.rule_uuid]
        : []
    )
  );

/**
 * Assign each expected event key to the best-matching actual, ensuring no actual
 * is claimed twice. Matching priority:
 * 1. Exact event_id match (when the key carries an event_id)
 * 2. Highest count of shared confirming detection-signal rule UUIDs
 *
 * Non-confirming signals are excluded from overlap so dismissed events
 * do not compete against the correct open event when both share a rule UUID.
 *
 * Returns an array of matched actuals (or undefined) in the same order as `expected`.
 */
export const alignExpectedEventsToActuals = (
  expected: ReadonlyArray<{
    readonly event_id?: string;
    readonly expectedRuleUuids: ReadonlySet<string>;
  }>,
  actuals: SignificantEvent[]
): Array<SignificantEvent | undefined> => {
  const assigned = new Set<SignificantEvent>();
  return expected.map((key) => {
    if (key.event_id) {
      const exactMatch = actuals.find((a) => !assigned.has(a) && a.event_id === key.event_id);
      if (exactMatch) {
        assigned.add(exactMatch);
        return exactMatch;
      }
    }

    let best: SignificantEvent | undefined;
    let bestOverlap = 0;
    for (const actual of actuals) {
      if (assigned.has(actual)) continue;
      const confirmedUuids = getConfirmedDetectionRuleUuids(actual);
      const overlap = [...confirmedUuids].filter((u) => key.expectedRuleUuids.has(u)).length;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = actual;
      }
    }

    if (best) assigned.add(best);
    return best;
  });
};
