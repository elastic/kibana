/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryEvaluator } from '../../types';

/** CODE evaluator: every active detection signal must carry an `evidence` entry. Score = covered / total rules. */
export const evidenceCollectionEvaluator: DiscoveryEvaluator = {
  name: 'evidence_collection',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const discoveries = output?.discoveries ?? [];

    let totalRules = 0;
    let covered = 0;
    const issues: string[] = [];

    for (const [i, discovery] of discoveries.entries()) {
      const signals = (discovery.signals ?? []).filter((s) => s.type === 'detection');

      for (const signal of signals) {
        const ruleUuid = signal.metadata?.rule_uuid;
        if (!ruleUuid) {
          continue;
        }
        totalRules++;
        if (signal.evidence != null) {
          covered++;
        } else {
          issues.push(
            `[${i}] no evidence collected for rule "${signal.metadata?.rule_name ?? ruleUuid}"`
          );
        }
      }
    }

    if (totalRules === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No detection signals present — nothing to collect evidence for',
      });
    }

    const score = covered / totalRules;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${totalRules} rule(s) have collected evidence`,
    });
  },
};
