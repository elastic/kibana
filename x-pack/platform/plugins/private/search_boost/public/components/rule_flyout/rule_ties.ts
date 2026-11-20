/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfileType, BoostRule } from '../../../common/types';

type PatternKind = 'matchAll' | 'wildcard' | 'exact';

export interface RankedRule extends Pick<BoostRule, 'name' | 'index_pattern' | 'priority'> {
  type: BoostProfileType;
}

const getPatternKind = (pattern: string): PatternKind => {
  if (pattern === '*') {
    return 'matchAll';
  }
  return pattern.includes('*') ? 'wildcard' : 'exact';
};

/** Whether two index patterns, where `*` is the only wildcard, can match the same name. */
export const patternsOverlap = (patternA: string, patternB: string): boolean => {
  const width = patternB.length + 1;
  const memo = new Map<number, boolean>();

  const overlapsFrom = (a: number, b: number): boolean => {
    const key = a * width + b;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }
    let overlaps: boolean;
    if (a === patternA.length && b === patternB.length) {
      overlaps = true;
    } else if (patternA[a] === '*') {
      overlaps = overlapsFrom(a + 1, b) || (b < patternB.length && overlapsFrom(a, b + 1));
    } else if (patternB[b] === '*') {
      overlaps = overlapsFrom(a, b + 1) || (a < patternA.length && overlapsFrom(a + 1, b));
    } else {
      overlaps =
        a < patternA.length &&
        b < patternB.length &&
        patternA[a] === patternB[b] &&
        overlapsFrom(a + 1, b + 1);
    }
    memo.set(key, overlaps);
    return overlaps;
  };

  return overlapsFrom(0, 0);
};

/**
 * Finds a rule that Elasticsearch would reject as a tie: same type and priority, the same kind of
 * pattern (exact name, wildcard or match-all), and patterns that can match the same name.
 */
export const findTiedRule = <Rule extends RankedRule>(
  rule: RankedRule,
  rules: readonly Rule[]
): Rule | undefined => {
  const kind = getPatternKind(rule.index_pattern);
  return rules.find(
    (other) =>
      other.name !== rule.name &&
      other.type === rule.type &&
      other.priority === rule.priority &&
      getPatternKind(other.index_pattern) === kind &&
      patternsOverlap(other.index_pattern, rule.index_pattern)
  );
};
