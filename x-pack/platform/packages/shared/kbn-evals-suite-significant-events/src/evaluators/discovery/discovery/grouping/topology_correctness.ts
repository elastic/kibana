/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';

export interface TopologyScore {
  score: number | null;
  explanation: string;
}

function f1(precision: number, recall: number): number {
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

export function featureF1(
  actualIds: string[],
  expectedIds: string[]
): { score: number; precision: number; recall: number } {
  if (expectedIds.length === 0) return { score: 1, precision: 1, recall: 1 };
  const actualSet = new Set(actualIds);
  const expectedSet = new Set(expectedIds);
  const tp = [...expectedSet].filter((id) => actualSet.has(id)).length;
  const precision = actualIds.length === 0 ? 0 : tp / actualIds.length;
  const recall = tp / expectedSet.size;
  return { score: f1(precision, recall), precision, recall };
}

function ruleUuids(signals: Array<{ metadata?: { rule_uuid?: string } }> | undefined): Set<string> {
  return new Set(
    (signals ?? []).map((s) => s.metadata?.rule_uuid).filter((id): id is string => Boolean(id))
  );
}

/** Keep only expected events whose signals overlap the actual write payload's rule UUIDs. */
export const filterExpectedEventsForActuals = (
  expectedEvents: Array<Partial<SignificantEvent>>,
  actuals: SignificantEvent[]
): Array<Partial<SignificantEvent>> => {
  const actualRuleUuids = new Set(actuals.flatMap((event) => [...ruleUuids(event.signals)]));
  if (actualRuleUuids.size === 0) {
    return expectedEvents;
  }

  return expectedEvents.filter((event) =>
    [...ruleUuids(event.signals)].some((ruleUuid) => actualRuleUuids.has(ruleUuid))
  );
};

function findBestMatch(
  expectedSignals: Array<{ metadata?: { rule_uuid?: string } }> | undefined,
  actuals: SignificantEvent[]
): SignificantEvent | undefined {
  const expectedKeys = ruleUuids(expectedSignals);
  let best: SignificantEvent | undefined;
  let bestOverlap = 0;
  for (const event of actuals) {
    const overlap = [...ruleUuids(event.signals)].filter((k) => expectedKeys.has(k)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = event;
    }
  }
  return bestOverlap > 0 ? best : undefined;
}

const topologyExpectedEvents = (
  expectedEvents: Array<Partial<SignificantEvent>>
): Array<Partial<SignificantEvent>> =>
  expectedEvents.filter(
    (event) => (event.causal_features?.length ?? 0) > 0 || (event.blast_radius?.length ?? 0) > 0
  );

const scoreTopologyFields = (
  actual: Partial<SignificantEvent>,
  expected: Partial<SignificantEvent>,
  eventLabel: string
): { score: number | null; explanations: string[] } => {
  const hasExpectedTopology =
    (expected.causal_features?.length ?? 0) > 0 || (expected.blast_radius?.length ?? 0) > 0;

  if (!hasExpectedTopology) {
    return { score: null, explanations: [] };
  }

  const explanations: string[] = [];
  const eventScores: number[] = [];

  if (expected.causal_features?.length) {
    const expectedIds = expected.causal_features.map((f) => f.feature_id);
    const actualIds = (actual.causal_features ?? []).map((f) => f.feature_id);
    const { score, precision, recall } = featureF1(actualIds, expectedIds);
    eventScores.push(score);
    if (score < 1) {
      explanations.push(
        `causal_features[${eventLabel}]: P=${precision.toFixed(2)} R=${recall.toFixed(
          2
        )} expected=[${expectedIds.join(',')}] got=[${actualIds.join(',')}]`
      );
    }
  }

  if (expected.blast_radius?.length) {
    const expectedIds = expected.blast_radius.map((f) => f.feature_id);
    const actualIds = (actual.blast_radius ?? []).map((f) => f.feature_id);
    const { score, precision, recall } = featureF1(actualIds, expectedIds);
    eventScores.push(score);
    if (score < 1) {
      explanations.push(
        `blast_radius[${eventLabel}]: P=${precision.toFixed(2)} R=${recall.toFixed(
          2
        )} expected=[${expectedIds.join(',')}] got=[${actualIds.join(',')}]`
      );
    }
  }

  const score =
    eventScores.length > 0 ? eventScores.reduce((a, b) => a + b, 0) / eventScores.length : 1;

  return { score, explanations };
};

/**
 * Precision/recall F1 over causal_features and blast_radius feature IDs.
 * Each expected event is matched to the actual event with the highest rule UUID overlap in signals.
 */
export const scoreTopologyCorrectness = (
  actuals: SignificantEvent[],
  expectedEvents: Array<Partial<SignificantEvent>>
): TopologyScore => {
  const topologyExpected = topologyExpectedEvents(expectedEvents);

  if (topologyExpected.length === 0) {
    return {
      score: null,
      explanation: 'No topology (causal_features or blast_radius) declared in expected events',
    };
  }

  const explanations: string[] = [];
  let totalScore = 0;

  for (const exp of topologyExpected) {
    const match = findBestMatch(exp.signals, actuals);

    if (!match) {
      explanations.push(`event=${exp.event_id ?? '?'}: no matching actual event found`);
      totalScore += 0;
      continue;
    }

    const { score: eventScore, explanations: fieldExplanations } = scoreTopologyFields(
      match,
      exp,
      exp.event_id ?? '?'
    );
    if (eventScore === null) {
      continue;
    }

    explanations.push(...fieldExplanations);
    totalScore += eventScore;
  }

  const score = totalScore / topologyExpected.length;
  return {
    score,
    explanation:
      explanations.length > 0
        ? explanations.join('; ')
        : `All ${topologyExpected.length} event(s): causal_features and blast_radius matched expected`,
  };
};

export interface ContinuationTopologyCycle {
  ruleName?: string;
  writeItems?: Partial<SignificantEvent>[];
  /** Whether this cycle should reuse an established event ID. Undefined on the establishing cycle. */
  expectReuse?: boolean;
}

/**
 * Score continuation writes against the establishing cycle's emitted topology.
 * Each follow-up cycle with `expectReuse !== false` must preserve that topology in events_write.
 */
export const scoreContinuationTopologyCorrectness = (
  cycles: ContinuationTopologyCycle[]
): TopologyScore => {
  const establishingIndex = cycles.findIndex((cycle) => (cycle.writeItems?.length ?? 0) > 0);
  if (establishingIndex < 0) {
    return {
      score: null,
      explanation: 'No establishing events_write payload to score continuation topology against',
    };
  }

  const establishingItems = (cycles[establishingIndex].writeItems ?? []) as SignificantEvent[];
  const followUps = cycles
    .map((cycle, index) => ({ cycle, index }))
    .filter(
      ({ cycle, index }) =>
        index > establishingIndex &&
        (cycle.writeItems?.length ?? 0) > 0 &&
        cycle.expectReuse !== false
    );

  if (followUps.length === 0) {
    return {
      score: null,
      explanation: 'No continuation follow-up cycles with expected event reuse to score topology',
    };
  }

  const explanations: string[] = [];
  let totalScore = 0;

  for (const { cycle, index } of followUps) {
    const writeItems = (cycle.writeItems ?? []) as SignificantEvent[];
    const establishing = establishingItems[0];
    const followUp = writeItems[0];

    if (!establishing || !followUp) {
      explanations.push(`cycle ${index + 1} (${cycle.ruleName ?? '?'}): missing write item`);
      totalScore += 0;
      continue;
    }

    const result = scoreTopologyFields(followUp, establishing, `establishing-0`);
    if (result.score === null) {
      explanations.push(
        `cycle ${index + 1} (${cycle.ruleName ?? '?'}): establishing topology was empty`
      );
      totalScore += 0;
      continue;
    }

    totalScore += result.score;
    if (result.score < 1) {
      explanations.push(
        `cycle ${index + 1} (${cycle.ruleName ?? '?'}): ${result.explanations.join('; ')}`
      );
    }
  }

  const score = totalScore / followUps.length;
  return {
    score,
    explanation:
      explanations.length > 0
        ? explanations.join('; ')
        : `All ${followUps.length} continuation cycle(s) preserved establishing topology in events_write`,
  };
};

/**
 * CODE evaluator: precision/recall F1 over causal_features and blast_radius feature IDs against
 * expected_significant_events. Only scores events that declare at least one topology field.
 * Each expected event is matched to the actual event with the highest rule UUID overlap in signals.
 */
export const topologyCorrectnessEvaluator: DiscoveryEvaluator = {
  name: 'topology_correctness',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const result = scoreTopologyCorrectness(
      output?.significantEvents ?? [],
      expected?.expected_significant_events ?? []
    );

    if (result.score === null) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: result.explanation,
      });
    }

    return Promise.resolve(result);
  },
};
