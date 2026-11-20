/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRuleMatch } from '../../../common/types';

export type TargetMatch = 'exact' | 'partial';

export interface NamePart {
  text: string;
  /** Whether this part is literally what the user typed. */
  isTyped: boolean;
}

export interface MatchedTarget extends BoostRuleMatch {
  match?: TargetMatch;
  nameParts: NamePart[];
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Each literal part of the pattern becomes an even capture group, and each `*` an odd one.
const toMatcher = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => `(${escapeRegExp(part)})`)
      .join('(.*?)')}$`
  );

const toNameParts = ([, ...groups]: RegExpExecArray): NamePart[] =>
  groups
    .map((text, index) => ({ text, isTyped: index % 2 === 0 }))
    .filter(({ text }) => text.length > 0);

const unmatched = (target: BoostRuleMatch): MatchedTarget => ({
  ...target,
  nameParts: [{ text: target.name, isTyped: false }],
});

/**
 * Marks each target as an exact match of the pattern, or a partial one when its name contains the
 * pattern, and splits its name to highlight what was typed.
 */
export const matchTargets = (
  pattern: string,
  targets: readonly BoostRuleMatch[]
): MatchedTarget[] => {
  if (pattern.length === 0) {
    return targets.map(unmatched);
  }
  const exactMatcher = toMatcher(pattern);
  const partialMatcher = toMatcher(`*${pattern}*`);

  return targets.map((target) => {
    const exact = exactMatcher.exec(target.name);
    if (exact) {
      return { ...target, match: 'exact', nameParts: toNameParts(exact) };
    }
    const partial = partialMatcher.exec(target.name);
    return partial
      ? { ...target, match: 'partial', nameParts: toNameParts(partial) }
      : unmatched(target);
  });
};
