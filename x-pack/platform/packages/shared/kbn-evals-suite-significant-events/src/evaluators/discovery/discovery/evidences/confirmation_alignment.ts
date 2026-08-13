/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';

const asSet = (values: string[]): Set<string> => new Set(values);

const getRuleSignals = (event: SignificantEvent) =>
  (event.signals ?? []).flatMap((signal) =>
    signal.type === 'detection' && signal.metadata?.rule_uuid
      ? [
          {
            ruleUuid: signal.metadata.rule_uuid,
            confirmed: signal.confirmed,
            collected_at: signal.collected_at,
            evidence: signal.evidence,
          },
        ]
      : []
  );

const sharedRuleCount = (event: SignificantEvent, expectedRuleUuids: Set<string>) => {
  const eventRuleUuids = new Set(
    getRuleSignals(event)
      .filter((signal) => signal.confirmed !== false)
      .map((signal) => signal.ruleUuid)
  );
  return [...eventRuleUuids].filter((ruleUuid) => expectedRuleUuids.has(ruleUuid)).length;
};

export const confirmationAlignmentEvaluator: DiscoveryEvaluator = {
  name: 'confirmation_alignment',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const expectedByEvent = expected?.expected_confirmed_rule_uuids;
    if (!expectedByEvent || Object.keys(expectedByEvent).length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No expected confirmed rule UUIDs declared',
      });
    }

    const issues: string[] = [];
    let matched = 0;
    const assignedEvents = new Set<number>();

    for (const [eventId, expectedRuleUuids] of Object.entries(expectedByEvent)) {
      const expectedRuleSet = asSet(expectedRuleUuids);
      const exactIdIndex = output.significantEvents.findIndex(
        (candidate, index) => !assignedEvents.has(index) && candidate.event_id === eventId
      );
      const eventIndex =
        exactIdIndex >= 0
          ? exactIdIndex
          : output.significantEvents.reduce(
              (bestIndex, candidate, index) => {
                if (assignedEvents.has(index)) {
                  return bestIndex;
                }

                const candidateSharedRuleCount = sharedRuleCount(candidate, expectedRuleSet);
                return candidateSharedRuleCount > bestIndex.sharedRuleCount
                  ? { index, sharedRuleCount: candidateSharedRuleCount }
                  : bestIndex;
              },
              { index: -1, sharedRuleCount: 0 }
            ).index;
      const event = eventIndex >= 0 ? output.significantEvents[eventIndex] : undefined;
      if (!event) {
        issues.push(`${eventId}: missing from agent output`);
        continue;
      }
      assignedEvents.add(eventIndex);
      // Only detection signals carry a rule identity; other signal types (manual ES|QL
      // evidence, KI grounding) are outside the expected-membership contract.
      const ruleSignals = getRuleSignals(event);
      const actualRuleUuids = asSet(
        ruleSignals.filter((signal) => signal.confirmed === true).map((signal) => signal.ruleUuid)
      );
      const nonMembersWithoutRejection = ruleSignals
        .filter(
          (signal) =>
            !expectedRuleSet.has(signal.ruleUuid) &&
            signal.confirmed !== false &&
            (signal.confirmed !== undefined ||
              signal.collected_at !== undefined ||
              signal.evidence !== undefined)
        )
        .map((signal) => signal.ruleUuid);
      const isExactMatch =
        actualRuleUuids.size === expectedRuleSet.size &&
        [...actualRuleUuids].every((ruleUuid) => expectedRuleSet.has(ruleUuid)) &&
        nonMembersWithoutRejection.length === 0;

      if (isExactMatch) {
        matched++;
      } else {
        issues.push(
          `${eventId}: expected [${[...expectedRuleSet].sort().join(', ')}], received [${[
            ...actualRuleUuids,
          ]
            .sort()
            .join(', ')}]${
            nonMembersWithoutRejection.length > 0
              ? `; expected confirmed:false for [${nonMembersWithoutRejection.sort().join(', ')}]`
              : ''
          }`
        );
      }
    }

    const score = matched / Object.keys(expectedByEvent).length;
    return Promise.resolve({
      score,
      explanation:
        issues.length === 0
          ? 'Confirmed signal membership matches every expected event'
          : issues.join('; '),
    });
  },
};
