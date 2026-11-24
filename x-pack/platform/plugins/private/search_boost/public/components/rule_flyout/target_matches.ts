/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRuleMatch } from '../../../common/types';

export type TargetMatchType = 'exact' | 'partial';

export interface NamePart {
  text: string;
  /** Whether this part is literally what the user typed. */
  isTyped: boolean;
}

export interface MatchedTarget extends BoostRuleMatch {
  matchType?: TargetMatchType;
  nameParts: NamePart[];
}

type Range = readonly [start: number, end: number];

// A regular expression with a group per `*` can backtrack combinatorially on several wildcards.
// With `*` as the only wildcard, taking each literal part at its earliest position is enough, so
// this takes at most one search per part.
const matchGlob = (pattern: string, name: string): Range[] | undefined => {
  const parts = pattern.split('*');
  if (parts.length === 1) {
    return pattern === name ? [[0, name.length]] : undefined;
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  const suffixStart = name.length - last.length;
  if (suffixStart < first.length || !name.startsWith(first) || !name.endsWith(last)) {
    return undefined;
  }

  const ranges: Range[] = [[0, first.length]];
  let position = first.length;
  for (const part of parts.slice(1, -1)) {
    const start = name.indexOf(part, position);
    if (start === -1 || start + part.length > suffixStart) {
      return undefined;
    }
    ranges.push([start, start + part.length]);
    position = start + part.length;
  }
  ranges.push([suffixStart, name.length]);
  return ranges;
};

const toNameParts = (name: string, typedRanges: readonly Range[]): NamePart[] => {
  const parts: NamePart[] = [];
  let position = 0;
  for (const [start, end] of typedRanges) {
    parts.push(
      { text: name.slice(position, start), isTyped: false },
      { text: name.slice(start, end), isTyped: true }
    );
    position = end;
  }
  parts.push({ text: name.slice(position), isTyped: false });
  return parts.filter(({ text }) => text.length > 0);
};

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

  return targets.map((target) => {
    const { name } = target;
    const exact = matchGlob(pattern, name);
    if (exact) {
      return { ...target, matchType: 'exact', nameParts: toNameParts(name, exact) };
    }
    const partial = matchGlob(`*${pattern}*`, name);
    return partial
      ? { ...target, matchType: 'partial', nameParts: toNameParts(name, partial) }
      : unmatched(target);
  });
};
