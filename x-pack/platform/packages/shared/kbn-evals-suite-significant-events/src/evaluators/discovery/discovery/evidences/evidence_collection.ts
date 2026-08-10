/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';

const detectionSignalsByRuleUuid = (
  events: Parameters<DiscoveryEvaluator['evaluate']>[0]['output']['significantEvents']
): Map<string, SignalEntry[]> => {
  const signalsByRuleUuid = new Map<string, SignalEntry[]>();
  for (const event of events ?? []) {
    for (const signal of event.signals ?? []) {
      if (signal.type !== 'detection') {
        continue;
      }
      const ruleUuid = signal.metadata?.rule_uuid ?? '';
      signalsByRuleUuid.set(ruleUuid, [...(signalsByRuleUuid.get(ruleUuid) ?? []), signal]);
    }
  }
  return signalsByRuleUuid;
};

const hasQuietNoQueryDisposition = (signal: SignalEntry): boolean =>
  signal.evidence == null &&
  signal.confirmed === undefined &&
  /no backed query KI (?:matched|available)/i.test(signal.description);

/** CODE evaluator: every input detection has one signal and evidence when an exact backed query exists. */
export const evidenceCollectionEvaluator: DiscoveryEvaluator = {
  name: 'evidence_collection',
  kind: 'CODE',
  evaluate: ({ input, output }) => {
    const detections = output.inputDetections ?? input.detections ?? [];
    const expectedRuleUuids = new Set(
      detections
        .map(({ rule_uuid: ruleUuid }) => ruleUuid)
        .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid))
    );
    const signalsByRuleUuid = detectionSignalsByRuleUuid(output.significantEvents);
    const issues: string[] = [];
    let covered = 0;

    if (expectedRuleUuids.size === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No input detections present — nothing to collect evidence for',
      });
    }

    for (const ruleUuid of expectedRuleUuids) {
      const signals = signalsByRuleUuid.get(ruleUuid) ?? [];
      if (signals.length === 0) {
        issues.push(`missing signal for input rule "${ruleUuid}"`);
      } else if (signals.length > 1) {
        issues.push(`duplicate signals for input rule "${ruleUuid}"`);
      } else if (signals[0].evidence == null && !hasQuietNoQueryDisposition(signals[0])) {
        issues.push(`no ES|QL evidence for input rule "${ruleUuid}"`);
      } else {
        covered++;
      }
    }

    const unexpectedRuleUuids = [...signalsByRuleUuid.keys()].filter(
      (ruleUuid) => !expectedRuleUuids.has(ruleUuid)
    );
    if (unexpectedRuleUuids.length > 0) {
      const unexpectedRules = unexpectedRuleUuids
        .map((ruleUuid) => (ruleUuid ? `"${ruleUuid}"` : 'a signal without metadata.rule_uuid'))
        .join(', ');
      return Promise.resolve({
        score: 0,
        label: 'unexpected-rule-uuid',
        explanation: `Agent output contains detection signal(s) not present in the input batch: ${unexpectedRules}`,
      });
    }

    const score = covered / expectedRuleUuids.size;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${expectedRuleUuids.size} input rule(s) have the required signal and evidence coverage`,
    });
  },
};
