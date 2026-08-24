/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContinuationCycle, ContinuationEvaluator } from './continuation_stability';
import { severityRank } from '../severity/severity_rank';

const openEventsWithSeverity = (cycle: ContinuationCycle) =>
  (cycle.producedEvents ?? []).filter(
    (event) => event.event_id && event.status === 'open' && event.severity
  );

export interface ContinuationSeverityStabilityResult {
  score: number | null;
  stableChecks: number;
  comparableChecks: number;
  explanation: string;
}

/**
 * Scores whether continued open events keep or raise severity relative to the establishing cycle.
 * Downgrades on unchanged reuse paths are failures; escalations are allowed.
 */
export const scoreContinuationSeverityStability = (
  cycles: ContinuationCycle[]
): ContinuationSeverityStabilityResult => {
  let established = false;
  const baselineSeverityByEventId = new Map<string, number>();
  let stableChecks = 0;
  let comparableChecks = 0;
  const issues: string[] = [];

  cycles.forEach((cycle, cycleIndex) => {
    const openEvents = openEventsWithSeverity(cycle);

    if (!established) {
      if (openEvents.length === 0) {
        return;
      }
      for (const event of openEvents) {
        const rank = severityRank(event.severity);
        if (rank !== undefined && event.event_id) {
          baselineSeverityByEventId.set(event.event_id, rank);
        }
      }
      established = true;
      return;
    }

    if (cycle.expectReuse === false || openEvents.length === 0) {
      return;
    }

    for (const event of openEvents) {
      const eventId = event.event_id!;
      const baselineRank = baselineSeverityByEventId.get(eventId);
      if (baselineRank === undefined) {
        // Event first seen after the establishing cycle — seed it now so later cycles can track it
        const seedRank = severityRank(event.severity);
        if (seedRank !== undefined) {
          baselineSeverityByEventId.set(eventId, seedRank);
        }
        continue;
      }

      const followUpRank = severityRank(event.severity);
      comparableChecks++;
      if (followUpRank === undefined) {
        issues.push(
          `cycle ${cycleIndex}: continued event "${eventId}" has missing or invalid severity`
        );
        continue;
      }

      if (followUpRank <= baselineRank) {
        stableChecks++;
        continue;
      }

      issues.push(
        `cycle ${cycleIndex}: severity downgraded for continued event "${eventId}" (${event.severity})`
      );
    }
  });

  if (comparableChecks === 0) {
    return {
      score: null,
      stableChecks: 0,
      comparableChecks: 0,
      explanation:
        issues.length > 0
          ? `No comparable continued events with severity: ${issues.join('; ')}`
          : 'No continued open events with severity to compare against the establishing cycle',
    };
  }

  const score = stableChecks / comparableChecks;
  return {
    score,
    stableChecks,
    comparableChecks,
    explanation:
      issues.length > 0
        ? `${stableChecks}/${comparableChecks} continued event(s) kept or raised severity (${issues.join(
            '; '
          )})`
        : `All ${comparableChecks} continued event(s) kept or raised severity`,
  };
};

/** CODE evaluator: continued open events must not downgrade severity on reuse paths. */
export const continuationSeverityStabilityEvaluator: ContinuationEvaluator = {
  name: 'continuation_severity_stability',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) =>
    Promise.resolve(scoreContinuationSeverityStability(output.cycles ?? [])),
};
