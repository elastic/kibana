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

const PROFILE_TYPE_BY_DATA_SOURCE: Readonly<Record<DataSourceType, BoostProfileType>> = {
  index: 'indices',
  data_stream: 'data_streams',
};

const escapeRegExp = (value: string) => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Whether an index pattern (a concrete name or a pattern using `*`) matches a data source name. */
export const matchesIndexPattern = (pattern: string, name: string): boolean =>
  new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`).test(name);

/** Ranks how specifically a pattern matches: exact names first, then longer literal patterns. */
const getSpecificity = (pattern: string): [number, number] => [
  pattern.includes('*') ? 0 : 1,
  pattern.replace(/\*/g, '').length,
];

/**
 * Orders matching rules the way the Elasticsearch boost rule resolver does: higher priority first,
 * then exact names over wildcards, then more specific wildcards. Rule name breaks remaining ties.
 */
const compareRules = (a: BoostRule, b: BoostRule): number => {
  const [aExact, aLength] = getSpecificity(a.index_pattern);
  const [bExact, bLength] = getSpecificity(b.index_pattern);
  return (
    b.priority - a.priority || bExact - aExact || bLength - aLength || a.name.localeCompare(b.name)
  );
};

/** Sorts rules in the order Elasticsearch considers them, with the default rules last. */
export const sortRules = (rules: readonly BoostRule[]): BoostRule[] =>
  [...rules].sort((a, b) => Number(a.is_builtin) - Number(b.is_builtin) || compareRules(a, b));

const ruleMatches = (
  { index_pattern: pattern, boost_profile: profileName }: BoostRule,
  dataSource: BoostDataSource,
  profilesByName: ReadonlyMap<string, BoostProfile>
): boolean =>
  profilesByName.get(profileName)?.type === PROFILE_TYPE_BY_DATA_SOURCE[dataSource.type] &&
  matchesIndexPattern(pattern, dataSource.name);

/** Returns the rule that applies to a data source, or `undefined` if none matches. */
export const resolveRule = (
  dataSource: BoostDataSource,
  rules: readonly BoostRule[],
  profilesByName: ReadonlyMap<string, BoostProfile>
): BoostRule | undefined =>
  rules.filter((rule) => ruleMatches(rule, dataSource, profilesByName)).sort(compareRules)[0];

export interface RuleCoverage {
  /** Data sources of the rule's type that its pattern matches. */
  matches: number;
  /** Matching data sources the rule actually applies to, after higher-ranked rules. */
  appliesTo: number;
}

/** For each rule, counts the data sources it matches and the ones it applies to. */
export const getRuleCoverage = (
  dataSources: readonly BoostDataSource[],
  rules: readonly BoostRule[],
  profiles: readonly BoostProfile[]
): Map<string, RuleCoverage> => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const coverage = new Map(
    rules.map(({ name }): [string, RuleCoverage] => [name, { matches: 0, appliesTo: 0 }])
  );

  dataSources.forEach((dataSource) => {
    rules.forEach((rule) => {
      const ruleCoverage = coverage.get(rule.name);
      if (ruleCoverage && ruleMatches(rule, dataSource, profilesByName)) {
        ruleCoverage.matches++;
      }
    });
    const appliedRule = resolveRule(dataSource, rules, profilesByName);
    const appliedCoverage = appliedRule && coverage.get(appliedRule.name);
    if (appliedCoverage) {
      appliedCoverage.appliesTo++;
    }
  });
  return coverage;
};

/** Counts the data sources whose applied rule uses each profile. */
export const countDataSourcesByProfile = (
  dataSources: readonly BoostDataSource[],
  rules: readonly BoostRule[],
  profiles: readonly BoostProfile[]
): Map<string, number> => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const counts = new Map<string, number>();

  dataSources.forEach((dataSource) => {
    const rule = resolveRule(dataSource, rules, profilesByName);
    if (rule) {
      counts.set(rule.boost_profile, (counts.get(rule.boost_profile) ?? 0) + 1);
    }
  });
  return counts;
};

/** Counts the rules that reference each profile. */
export const countRulesByProfile = (rules: readonly BoostRule[]): Map<string, number> =>
  rules.reduce(
    (counts, { boost_profile: name }) => counts.set(name, (counts.get(name) ?? 0) + 1),
    new Map<string, number>()
  );
