/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoostDataSource,
  BoostProfile,
  BoostProfileType,
  BoostRule,
  DataSourceType,
} from './types';

/** The profile type that applies to each kind of data source. */
export const PROFILE_TYPE_BY_DATA_SOURCE: Readonly<Record<DataSourceType, BoostProfileType>> = {
  index: 'indices',
  data_stream: 'data_streams',
};

const escapeRegExp = (value: string) => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Whether an index pattern (a concrete name or a pattern using `*`) matches a data source name. */
export const matchesIndexPattern = (pattern: string, name: string): boolean =>
  new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`).test(name);

/** A part of a data source name, and whether the index pattern spells it out rather than a `*`. */
export interface IndexPatternPart {
  text: string;
  isLiteral: boolean;
}

/** Splits a data source name into the parts an index pattern spells out and the parts its `*`s match. */
export const splitByIndexPattern = (pattern: string, name: string): IndexPatternPart[] => {
  const literals = pattern.split('*').map((literal) => `(${escapeRegExp(literal)})`);
  const match = new RegExp(`^${literals.join('(.*)')}$`).exec(name);
  if (!match) {
    return [{ text: name, isLiteral: false }];
  }
  // Groups alternate between the pattern's literals and what its `*`s match.
  return match
    .slice(1)
    .map((text, index) => ({ text, isLiteral: index % 2 === 0 }))
    .filter(({ text }) => text.length > 0);
};

/** Ranks how specifically a pattern matches: exact names first, then longer literal patterns. */
const getSpecificity = (pattern: string): [number, number] => [
  pattern.includes('*') ? 0 : 1,
  pattern.replace(/\*/g, '').length,
];

/** Sorts patterns from most to least specific. */
const compareSpecificity = (a: string, b: string): number => {
  const [aExact, aLength] = getSpecificity(a);
  const [bExact, bLength] = getSpecificity(b);
  return bExact - aExact || bLength - aLength;
};

/** Returns the rule's most specific pattern that matches the data source, if any. */
const getMatchingPattern = (
  { index_patterns: patterns, boost_profile: profileName }: BoostRule,
  dataSource: BoostDataSource,
  profilesByName: ReadonlyMap<string, BoostProfile>
): string | undefined =>
  profilesByName.get(profileName)?.type === PROFILE_TYPE_BY_DATA_SOURCE[dataSource.type]
    ? patterns
        .filter((pattern) => matchesIndexPattern(pattern, dataSource.name))
        .sort(compareSpecificity)[0]
    : undefined;

interface RuleMatch {
  rule: BoostRule;
  pattern: string;
}

const isRuleMatch = (match: { rule: BoostRule; pattern?: string }): match is RuleMatch =>
  match.pattern !== undefined;

/**
 * Returns the rule that applies to a data source, or `undefined` if none matches. Matching rules
 * are ordered the way the Elasticsearch boost rule resolver does: higher priority first, then exact
 * names over patterns, then more specific patterns. Rule name breaks remaining ties.
 */
export const resolveRule = (
  dataSource: BoostDataSource,
  rules: readonly BoostRule[],
  profilesByName: ReadonlyMap<string, BoostProfile>
): BoostRule | undefined =>
  rules
    .map((rule) => ({ rule, pattern: getMatchingPattern(rule, dataSource, profilesByName) }))
    .filter(isRuleMatch)
    .sort(
      (a, b) =>
        b.rule.priority - a.rule.priority ||
        compareSpecificity(a.pattern, b.pattern) ||
        a.rule.name.localeCompare(b.rule.name)
    )[0]?.rule;

export interface RuleCoverage {
  /** Data sources of the rule's type that its patterns match. */
  matches: number;
  /** Their names, in the order of the data sources. */
  matchedNames: string[];
  /** Matching data sources the rule actually applies to, after higher-ranked rules. */
  appliesTo: number;
  /** Matching data sources that a higher-ranked rule applies to instead, with that rule's name. */
  supersededBy: Map<string, string>;
}

/**
 * For each rule, counts the data sources it matches and the ones it applies to, and names the
 * rule that applies to each of the others.
 */
export const getRuleCoverage = (
  dataSources: readonly BoostDataSource[],
  rules: readonly BoostRule[],
  profiles: readonly BoostProfile[]
): Map<string, RuleCoverage> => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const coverage = new Map(
    rules.map(({ name }): [string, RuleCoverage] => [
      name,
      { matches: 0, matchedNames: [], appliesTo: 0, supersededBy: new Map() },
    ])
  );

  dataSources.forEach((dataSource) => {
    const appliedRule = resolveRule(dataSource, rules, profilesByName);
    rules.forEach((rule) => {
      const ruleCoverage = coverage.get(rule.name);
      if (!ruleCoverage || getMatchingPattern(rule, dataSource, profilesByName) === undefined) {
        return;
      }
      ruleCoverage.matches++;
      ruleCoverage.matchedNames.push(dataSource.name);
      if (appliedRule?.name === rule.name) {
        ruleCoverage.appliesTo++;
      } else if (appliedRule) {
        ruleCoverage.supersededBy.set(dataSource.name, appliedRule.name);
      }
    });
  });
  return coverage;
};

/** Counts the rules that reference each profile. */
export const countRulesByProfile = (rules: readonly BoostRule[]): Map<string, number> =>
  rules.reduce(
    (counts, { boost_profile: name }) => counts.set(name, (counts.get(name) ?? 0) + 1),
    new Map<string, number>()
  );
