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
  BoostRuleInput,
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

/**
 * The kinds of pattern, from least to most specific, which Elasticsearch ranks rules of the same
 * priority by: `*` alone, other patterns using `*`, then exact names.
 */
const PATTERN_KINDS = ['match_all', 'wildcard', 'exact'] as const;

type PatternKind = (typeof PATTERN_KINDS)[number];

const getPatternKind = (pattern: string): PatternKind =>
  pattern === '*' ? 'match_all' : pattern.includes('*') ? 'wildcard' : 'exact';

/** Sorts patterns from most to least specific. */
const compareSpecificity = (a: string, b: string): number =>
  PATTERN_KINDS.indexOf(getPatternKind(b)) - PATTERN_KINDS.indexOf(getPatternKind(a));

/** Whether some name matches both index patterns, each a concrete name or a pattern using `*`. */
export const patternsOverlap = (a: string, b: string): boolean => {
  // Whether the rest of each pattern, from a[i] and b[j], can match a common name.
  const memo = new Map<string, boolean>();
  const overlapsFrom = (i: number, j: number): boolean => {
    const key = `${i},${j}`;
    const memoized = memo.get(key);
    if (memoized !== undefined) {
      return memoized;
    }
    // A `*` matches nothing more, or takes the other pattern's next character, `*` or not.
    const overlaps =
      i === a.length && j === b.length
        ? true
        : a[i] === '*'
        ? overlapsFrom(i + 1, j) || (j < b.length && overlapsFrom(i, j + 1))
        : b[j] === '*'
        ? overlapsFrom(i, j + 1) || (i < a.length && overlapsFrom(i + 1, j))
        : i < a.length && j < b.length && a[i] === b[j] && overlapsFrom(i + 1, j + 1);
    memo.set(key, overlaps);
    return overlaps;
  };
  return overlapsFrom(0, 0);
};

/** What rules match a data source by: its name, and its type. */
type DataSourceIdentity = Pick<BoostDataSource, 'name' | 'type'>;

/** Returns the rule's most specific pattern that matches the data source, if any. */
const getMatchingPattern = (
  { index_patterns: patterns, boost_profile: profileName }: BoostRule,
  dataSource: DataSourceIdentity,
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
 * Returns the rules that match a data source, ordered the way the Elasticsearch boost rule resolver
 * does: higher priority first, then exact names over other patterns, then those over `*`. The first
 * applies. Elasticsearch rejects rules that would still tie (see `findConflictingRule`), so the rule
 * name only orders ties saved before the prototype checked.
 */
export const getMatchingRules = (
  dataSource: DataSourceIdentity,
  rules: readonly BoostRule[],
  profilesByName: ReadonlyMap<string, BoostProfile>
): BoostRule[] =>
  rules
    .map((rule) => ({ rule, pattern: getMatchingPattern(rule, dataSource, profilesByName) }))
    .filter(isRuleMatch)
    .sort(
      (a, b) =>
        b.rule.priority - a.rule.priority ||
        compareSpecificity(a.pattern, b.pattern) ||
        a.rule.name.localeCompare(b.rule.name)
    )
    .map(({ rule }) => rule);

/** Returns the rule that applies to a data source, or `undefined` if none matches. */
export const resolveRule = (
  dataSource: DataSourceIdentity,
  rules: readonly BoostRule[],
  profilesByName: ReadonlyMap<string, BoostProfile>
): BoostRule | undefined => getMatchingRules(dataSource, rules, profilesByName)[0];

/**
 * Returns a rule that would tie with the given one, which Elasticsearch rejects: one with the same
 * priority and type of profile, and a pattern of the same kind that can match the same name, so
 * neither rule would apply over the other. A rule doesn't conflict with its own saved version.
 */
export const findConflictingRule = (
  { name, index_patterns: patterns, boost_profile: profileName, priority }: BoostRuleInput,
  rules: readonly BoostRule[],
  profilesByName: ReadonlyMap<string, BoostProfile>
): BoostRule | undefined => {
  const type = profilesByName.get(profileName)?.type;
  return rules.find(
    (rule) =>
      rule.name !== name &&
      rule.priority === priority &&
      type !== undefined &&
      profilesByName.get(rule.boost_profile)?.type === type &&
      patterns.some((pattern) =>
        rule.index_patterns.some(
          (rulePattern) =>
            getPatternKind(rulePattern) === getPatternKind(pattern) &&
            patternsOverlap(rulePattern, pattern)
        )
      )
  );
};

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

/** The rule that applies to each data source, by the data source's name. */
export const getAppliedRules = (
  dataSources: readonly BoostDataSource[],
  rules: readonly BoostRule[],
  profiles: readonly BoostProfile[]
): Map<string, BoostRule> => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  return new Map(
    dataSources.flatMap((dataSource): Array<[string, BoostRule]> => {
      const rule = resolveRule(dataSource, rules, profilesByName);
      return rule ? [[dataSource.name, rule]] : [];
    })
  );
};

/** Counts the rules that reference each profile. */
export const countRulesByProfile = (rules: readonly BoostRule[]): Map<string, number> =>
  rules.reduce(
    (counts, { boost_profile: name }) => counts.set(name, (counts.get(name) ?? 0) + 1),
    new Map<string, number>()
  );
