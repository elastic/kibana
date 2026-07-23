/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';

const detectionSignalsByRuleUuid = (
  discoveries: Parameters<DiscoveryEvaluator['evaluate']>[0]['output']['discoveries']
): Map<string, SignalEntry[]> => {
  const signalsByRuleUuid = new Map<string, SignalEntry[]>();
  for (const discovery of discoveries ?? []) {
    for (const signal of discovery.signals ?? []) {
      if (signal.type !== 'detection') {
        continue;
      }
      const ruleUuid = signal.metadata?.rule_uuid ?? '';
      signalsByRuleUuid.set(ruleUuid, [...(signalsByRuleUuid.get(ruleUuid) ?? []), signal]);
    }
  }
  return signalsByRuleUuid;
};

/** CODE evaluator: every input detection must have exactly one signal with executed ES|QL evidence. */
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
    const signalsByRuleUuid = detectionSignalsByRuleUuid(output.discoveries);
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
      } else if (signals[0].evidence == null) {
        issues.push(`no ES|QL evidence for input rule "${ruleUuid}"`);
      } else {
        covered++;
      }
    }

    const unexpectedRuleUuids = [...signalsByRuleUuid.keys()].filter(
      (ruleUuid) => !expectedRuleUuids.has(ruleUuid)
    );
    unexpectedRuleUuids.forEach((ruleUuid) => {
      issues.push(
        ruleUuid ? `unexpected signal for rule "${ruleUuid}"` : 'signal missing metadata.rule_uuid'
      );
    });

    const score = covered / (expectedRuleUuids.size + unexpectedRuleUuids.length);
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${expectedRuleUuids.size} input rule(s) have collected ES|QL evidence`,
    });
  },
};
