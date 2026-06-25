/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigatorEvaluator, InvestigatorOutput } from '../../types';

/**
 * Builds the set of unordered same-group `rule_name` pairs ("a|b" with a < b) for a partition.
 * Grouping correctness is order-independent and count-independent, so we compare which rules the
 * agent decided belong together rather than discovery indices. We key on `rule_name` (not
 * `rule_uuid`) so the expected grouping stays human-readable and re-authorable when a snapshot changes.
 */
function sameGroupPairs(groups: string[][]): Set<string> {
  const pairs = new Set<string>();
  for (const group of groups) {
    const rules = [...new Set(group)].sort();
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        pairs.add(`${rules[i]}|${rules[j]}`);
      }
    }
  }
  return pairs;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const value of a) {
    if (b.has(value)) {
      n++;
    }
  }
  return n;
}

/**
 * CODE evaluator: scores whether the investigator grouped detections into discoveries the way the
 * scenario expects. Uses pairwise F1 over "same-group" `rule_name` pairs — robust to a different
 * number of discoveries or ordering, and gives partial credit for a partially-correct partition.
 *
 * Skips (score null) when the scenario declares no `expected_discoveries` or there are fewer than
 * two rules to group.
 */
export const groupingCorrectnessEvaluator: InvestigatorEvaluator = {
  name: 'grouping_correctness',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    // Derive the expected grouping from the canonical expected_discoveries: each discovery's
    // detections form one group, keyed by rule_name.
    const expectedGroups = expected?.expected_discoveries?.map((discovery) =>
      ((discovery.detections ?? []) as Array<{ rule_name?: string }>)
        .map((d) => d.rule_name)
        .filter((name): name is string => Boolean(name))
    );
    if (!expectedGroups || expectedGroups.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No expected_discoveries declared for this scenario',
      });
    }

    const discoveries = (output as InvestigatorOutput)?.discoveries ?? [];
    const actualGroups = discoveries.map((discovery) => {
      const detections = (discovery.detections ?? []) as Array<{ rule_name?: string }>;
      return detections.map((d) => d.rule_name).filter((name): name is string => Boolean(name));
    });

    const totalRules = new Set(expectedGroups.flat()).size;
    if (totalRules < 2) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'Fewer than two rules to group — grouping is trivial',
      });
    }

    const expectedPairs = sameGroupPairs(expectedGroups);
    const actualPairs = sameGroupPairs(actualGroups);

    // No same-group pairs on either side → every rule is correctly its own discovery.
    if (expectedPairs.size === 0 && actualPairs.size === 0) {
      return Promise.resolve({
        score: 1,
        explanation: 'All rules correctly emitted as separate discoveries (no grouping expected)',
      });
    }

    const truePositives = intersectionSize(actualPairs, expectedPairs);
    const precision = actualPairs.size === 0 ? 0 : truePositives / actualPairs.size;
    const recall = expectedPairs.size === 0 ? 0 : truePositives / expectedPairs.size;
    const score = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    return Promise.resolve({
      score,
      explanation: `Grouping precision/recall ${score.toFixed(2)} (precision ${precision.toFixed(
        2
      )}, recall ${recall.toFixed(2)}) over ${expectedPairs.size} expected same-group pair(s)`,
    });
  },
};
