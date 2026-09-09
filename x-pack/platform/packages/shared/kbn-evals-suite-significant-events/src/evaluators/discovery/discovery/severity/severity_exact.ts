/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryEvaluator } from '../../types';
import { severityRank } from './severity_rank';

const ruleUuidFromSignal = (metadata: { rule_uuid?: string } | undefined): string | undefined =>
  metadata?.rule_uuid;

const expectedRuleUuids = (event: {
  signals?: Array<{ metadata?: { rule_uuid?: string } }>;
}): string[] => [
  ...new Set(
    (event.signals ?? [])
      .map((signal) => ruleUuidFromSignal(signal.metadata))
      .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid))
  ),
];

const coversExpectedRules = (
  actualEvent: { signals?: Array<{ metadata?: { rule_uuid?: string } }> },
  ruleUuids: string[]
): boolean => {
  if (ruleUuids.length === 0) {
    return false;
  }
  const actualUuids = new Set(expectedRuleUuids(actualEvent));
  return ruleUuids.every((ruleUuid) => actualUuids.has(ruleUuid));
};

const matchOpenEventByTitle = (
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

const matchesExpectedEvent = (
  actualEvent: {
    title?: string;
    signals?: Array<{ metadata?: { rule_uuid?: string } }>;
  },
  expectedEvent: {
    title?: string;
    signals?: Array<{ metadata?: { rule_uuid?: string } }>;
  }
): boolean => {
  const ruleUuids = expectedRuleUuids(expectedEvent);
  if (ruleUuids.length > 0) {
    return coversExpectedRules(actualEvent, ruleUuids);
  }
  return matchOpenEventByTitle(actualEvent.title, expectedEvent.title);
};

/**
 * CODE evaluator: matched open events must equal the expected severity tier.
 *
 * - Unmatched expected events are excluded from the score (grouping owns that failure mode).
 * - Under-escalation (actual below expected) and over-escalation (actual above expected) both fail.
 * - Matched events with invalid actual severity count as scored misses.
 */
export const severityExactEvaluator: DiscoveryEvaluator = {
  name: 'severity_exact',
  kind: 'CODE',
  direction: 'maximize',
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
    let scoredCount = 0;
    let invalidExpectedCount = 0;
    const issues: string[] = [];
    const usedActualIndices = new Set<number>();

    expectedOpenEvents.forEach((expectedEvent, index) => {
      const expectedSeverity = expectedEvent.severity;
      const expectedRank = severityRank(expectedSeverity);
      if (expectedRank === undefined) {
        invalidExpectedCount++;
        issues.push(`[${index}] expected severity "${expectedSeverity}" is not a known tier`);
        return;
      }

      const expectedRules = expectedRuleUuids(expectedEvent);
      const matchedActualIndex = openActualEvents.findIndex(
        (actualEvent, i) =>
          !usedActualIndices.has(i) && matchesExpectedEvent(actualEvent, expectedEvent)
      );

      if (matchedActualIndex === -1) {
        const matchHint =
          expectedRules.length > 0
            ? `rule_uuid(s) [${expectedRules.join(', ')}]`
            : `title "${expectedEvent.title ?? 'unknown'}"`;
        issues.push(`[${index}] unmatched expected ${matchHint} — excluded from severity score`);
        return;
      }
      usedActualIndices.add(matchedActualIndex);

      const matchedActual = openActualEvents[matchedActualIndex];
      const actualRank = severityRank(matchedActual.severity);
      scoredCount++;

      if (actualRank === undefined) {
        issues.push(
          `[${index}] matched event has invalid severity "${matchedActual.severity ?? 'missing'}"`
        );
        return;
      }

      const matchedLabel = matchedActual.title ?? matchedActual.event_id ?? 'event';

      if (actualRank === expectedRank) {
        satisfied++;
        return;
      }

      if (actualRank > expectedRank) {
        issues.push(
          `[${index}] under-severity for "${matchedLabel}": got ${matchedActual.severity}, expected ${expectedSeverity}`
        );
        return;
      }

      issues.push(
        `[${index}] over-severity for "${matchedLabel}": got ${matchedActual.severity}, expected ${expectedSeverity}`
      );
    });

    if (scoredCount === 0) {
      const hasFixtureError = invalidExpectedCount > 0;
      return Promise.resolve({
        score: null,
        label: hasFixtureError ? 'fixture-error' : 'unmatched',
        explanation: hasFixtureError
          ? `Fixture errors prevented severity scoring: ${issues.join('; ')}`
          : `No expected open events matched an actual event for severity scoring: ${issues.join(
              '; '
            )}`,
      });
    }

    const score = satisfied / scoredCount;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${scoredCount} matched open event(s) met their severity tier`,
    });
  },
};
