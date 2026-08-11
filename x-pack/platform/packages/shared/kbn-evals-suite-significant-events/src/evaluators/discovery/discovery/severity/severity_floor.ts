/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_OPTIONS, type Severity } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';

// SEVERITY_OPTIONS must be ordered most-severe first; lower index = higher severity
const SEVERITY_RANK = new Map<Severity, number>(
  SEVERITY_OPTIONS.map((severity, index) => [severity, index])
);

const severityRank = (severity: string | undefined): number | undefined => {
  if (!severity || !SEVERITY_RANK.has(severity as Severity)) {
    return undefined;
  }
  return SEVERITY_RANK.get(severity as Severity);
};

const matchOpenEvent = (
  actualTitle: string | undefined,
  expectedTitle: string | undefined
): boolean => {
  if (!actualTitle || !expectedTitle) {
    return false;
  }
  const normalize = (value: string) => value.trim().toLowerCase();
  const actual = normalize(actualTitle);
  const expected = normalize(expectedTitle);
  return actual === expected || actual.includes(expected) || expected.includes(actual);
};

/**
 * CODE evaluator: open events must meet or exceed the expected severity floor declared in
 * `expected_significant_events`.
 */
export const severityFloorEvaluator: DiscoveryEvaluator = {
  name: 'severity_floor',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const expectedEvents = expected?.expected_significant_events ?? [];
    const expectedOpenEvents = expectedEvents.filter(
      (event) => event.status === 'open' && event.severity
    );

    if (expectedOpenEvents.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No open expected_significant_events with severity declared',
      });
    }

    const actualEvents = output?.significantEvents ?? [];
    const openActualEvents = actualEvents.filter((event) => event.status === 'open');

    if (openActualEvents.length === 0) {
      return Promise.resolve({
        score: 0,
        label: 'missing-open-events',
        explanation: 'Agent emitted no open significant events',
      });
    }

    let satisfied = 0;
    let validDenominator = 0;
    const issues: string[] = [];
    const usedActualIndices = new Set<number>();

    expectedOpenEvents.forEach((expectedEvent, index) => {
      const expectedSeverity = expectedEvent.severity;
      const expectedRank = severityRank(expectedSeverity);
      if (expectedRank === undefined) {
        issues.push(`[${index}] expected severity "${expectedSeverity}" is not a known tier`);
        return;
      }
      validDenominator++;

      const matchedActualIndex = openActualEvents.findIndex(
        (actualEvent, i) =>
          !usedActualIndices.has(i) && matchOpenEvent(actualEvent.title, expectedEvent.title)
      );

      if (matchedActualIndex === -1) {
        issues.push(
          `[${index}] no open event matched expected title "${expectedEvent.title ?? 'unknown'}"`
        );
        return;
      }
      usedActualIndices.add(matchedActualIndex);

      const matchedActual = openActualEvents[matchedActualIndex];
      const actualRank = severityRank(matchedActual.severity);
      if (actualRank === undefined) {
        issues.push(
          `[${index}] matched event has invalid severity "${matchedActual.severity ?? 'missing'}"`
        );
        return;
      }

      if (actualRank <= expectedRank) {
        satisfied++;
        return;
      }

      issues.push(
        `[${index}] under-severity for "${matchedActual.title}": got ${matchedActual.severity}, expected >= ${expectedSeverity}`
      );
    });

    if (validDenominator === 0) {
      return Promise.resolve({
        score: null,
        label: 'fixture-error',
        explanation: `No valid expected tiers found: ${issues.join('; ')}`,
      });
    }

    const score = satisfied / validDenominator;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${validDenominator} open event(s) met their severity floor`,
    });
  },
};
