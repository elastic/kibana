/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Temporary. Elasticsearch plans to let `GET _boost/explain` run without an index, returning every
 * index and data stream that isn't a system one, with the rules that match it by rank and whether
 * it's hidden. Until then, this file works that out in Kibana, following the same matching and
 * ranking as Elasticsearch. Once it's available, the rules route calls it in place of
 * `getBoostTargets` and `explainTargets`, mapping its response to `BoostExplanation`, and this file
 * goes away.
 */

import { errors } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { BoostProfile, BoostProfileType, BoostRule } from '../../common/types';
import type { BoostExplanation } from './coverage';

/** An index or data stream that boost rules can apply to. */
export interface BoostTarget {
  name: string;
  /** The type of profile that applies to it. */
  type: BoostProfileType;
  isHidden: boolean;
}

/**
 * Elasticsearch rejects a lookup the user has no index privileges for instead of listing nothing.
 * `_data_stream` needs more than `_resolve/index`, so each one falls back to an empty list alone.
 */
const emptyIfForbidden = async <T>(request: Promise<T>, empty: T): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof errors.ResponseError && error.statusCode === 403) {
      return empty;
    }
    throw error;
  }
};

/**
 * Lists the regular indices and the data streams of the project, hidden ones included. Data stream
 * backing indices and system indices and data streams are left out, since rules don't apply to them.
 */
export const getBoostTargets = async (client: IScopedClusterClient): Promise<BoostTarget[]> => {
  const [{ indices }, { data_streams: dataStreams }] = await Promise.all([
    emptyIfForbidden(
      client.asCurrentUser.indices.resolveIndex({
        name: '*',
        expand_wildcards: ['open', 'hidden'],
      }),
      { indices: [], aliases: [], data_streams: [] }
    ),
    // Resolved names don't say whether a data stream is hidden or a system one.
    emptyIfForbidden(
      client.asCurrentUser.indices.getDataStream({
        name: '*',
        expand_wildcards: ['open', 'hidden'],
      }),
      { data_streams: [] }
    ),
  ]);

  return [
    ...indices
      .filter(
        ({ data_stream: dataStream, attributes }) => !dataStream && !attributes.includes('system')
      )
      .map(({ name, attributes }): BoostTarget => ({
        name,
        type: 'indices',
        isHidden: attributes.includes('hidden'),
      })),
    ...dataStreams
      .filter(({ system }) => !system)
      .map(({ name, hidden }): BoostTarget => ({ name, type: 'data_streams', isHidden: hidden })),
  ];
};

/**
 * Matches names against a pattern where each `*` stands for any characters. It looks for the parts
 * between each `*` in order instead of using a regular expression, which can take exponentially
 * long on a pattern with several `*`.
 */
const toNameMatcher = (pattern: string) => {
  const parts = pattern.split('*');
  if (parts.length === 1) {
    return (name: string) => name === pattern;
  }
  const prefix = parts[0];
  const suffix = parts[parts.length - 1];
  const middleParts = parts.slice(1, -1).filter(Boolean);

  return (name: string) => {
    const suffixStart = name.length - suffix.length;
    if (suffixStart < prefix.length || !name.startsWith(prefix) || !name.endsWith(suffix)) {
      return false;
    }
    let searchFrom = prefix.length;
    for (const part of middleParts) {
      const partStart = name.indexOf(part, searchFrom);
      if (partStart === -1 || partStart + part.length > suffixStart) {
        return false;
      }
      searchFrom = partStart + part.length;
    }
    return true;
  };
};

/** Exact names rank over other patterns using `*`, and those over `*` alone. */
const getSpecificity = (pattern: string) => (pattern === '*' ? 0 : pattern.includes('*') ? 1 : 2);

/** Ranks rules as Elasticsearch does: higher priority first, then the more specific pattern. */
const compareRank = (a: BoostRule, b: BoostRule) =>
  b.priority - a.priority ||
  getSpecificity(b.index_pattern) - getSpecificity(a.index_pattern) ||
  // Elasticsearch rejects rules that would tie, so the name only keeps the order stable.
  a.name.localeCompare(b.name);

/** Lists the rules that match each target, highest ranked first, as `GET _boost/explain` does. */
export const explainTargets = (
  rules: BoostRule[],
  profiles: BoostProfile[],
  targets: BoostTarget[]
): BoostExplanation[] => {
  const profileTypes = new Map(profiles.map(({ name, type }) => [name, type]));
  const rankedRules = rules
    .flatMap((rule) => {
      const type = profileTypes.get(rule.boost_profile);
      return type ? [{ ...rule, type, matchesName: toNameMatcher(rule.index_pattern) }] : [];
    })
    .sort(compareRank);

  return targets.map((target) => ({
    ...target,
    matchedRuleNames: rankedRules
      .filter(({ type, matchesName }) => type === target.type && matchesName(target.name))
      .map(({ name }) => name),
  }));
};
