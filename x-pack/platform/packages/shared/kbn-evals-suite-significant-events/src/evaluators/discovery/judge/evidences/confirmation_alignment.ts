/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryJudgeEvaluator } from '../../types';

const asSet = (values: string[]): Set<string> => new Set(values);

export const confirmationAlignmentEvaluator: DiscoveryJudgeEvaluator = {
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

    for (const [eventId, expectedRuleUuids] of Object.entries(expectedByEvent)) {
      const event = output.significantEvents.find((candidate) => candidate.event_id === eventId);
      if (!event) {
        issues.push(`${eventId}: missing from judge output`);
        continue;
      }
      const expectedRuleSet = asSet(expectedRuleUuids);
      // Only detection signals carry a rule identity; other signal types (manual ES|QL
      // evidence, KI grounding) are outside the expected-membership contract.
      const ruleSignals = (event.signals ?? []).flatMap((signal) =>
        signal.type === 'detection' && signal.metadata?.rule_uuid
          ? [{ ruleUuid: signal.metadata.rule_uuid, confirmed: signal.confirmed }]
          : []
      );
      const actualRuleUuids = asSet(
        ruleSignals.filter((signal) => signal.confirmed === true).map((signal) => signal.ruleUuid)
      );
      const nonMembersWithoutRejection = ruleSignals
        .filter((signal) => !expectedRuleSet.has(signal.ruleUuid) && signal.confirmed !== false)
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
