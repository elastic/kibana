/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Removes AND-separated parts that reference episode_status (quick-filter managed). */
export const stripEpisodeStatusClauses = (matcher: string): string =>
  matcher
    .split(/\s+AND\s+/i)
    .map((p) => p.trim())
    .filter((p) => p && !p.toLowerCase().includes('episode_status'))
    .join(' AND ');

export const buildEpisodeStatusClause = (statuses: readonly string[]): string | null => {
  if (statuses.length === 0) {
    return null;
  }
  if (statuses.length === 1) {
    return `episode_status : "${statuses[0]}"`;
  }
  return `(${statuses.map((s) => `episode_status : "${s}"`).join(' or ')})`;
};

export const mergeEpisodeStatusIntoMatcher = (
  matcher: string,
  statuses: readonly string[]
): string => {
  const base = stripEpisodeStatusClauses(matcher).trim();
  const clause = buildEpisodeStatusClause(statuses);
  if (!clause) {
    return base;
  }
  return base ? `${base} AND ${clause}` : clause;
};

/** Best-effort parse of episode_status values already in the matcher (for checkbox sync). */
export const parseEpisodeStatusesFromMatcher = (matcher: string): string[] => {
  const found = new Set<string>();
  const re = /episode_status\s*:\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null = re.exec(matcher);
  while (m !== null) {
    found.add(m[1]);
    m = re.exec(matcher);
  }
  return [...found];
};

/** Removes AND-separated parts that reference rule.id (quick-filter managed). */
export const stripRuleIdClauses = (matcher: string): string =>
  matcher
    .split(/\s+AND\s+/i)
    .map((p) => p.trim())
    .filter((p) => p && !p.toLowerCase().includes('rule.id'))
    .join(' AND ');

export const parseRuleIdsFromMatcher = (matcher: string): string[] => {
  const found = new Set<string>();
  const re = /rule\.id\s*:\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null = re.exec(matcher);
  while (m !== null) {
    found.add(m[1]);
    m = re.exec(matcher);
  }
  return [...found];
};

export const mergeRuleIdsIntoMatcher = (matcher: string, ids: readonly string[]): string => {
  const base = stripRuleIdClauses(matcher).trim();
  if (ids.length === 0) {
    return base;
  }
  const clause =
    ids.length === 1
      ? `rule.id : "${ids[0]}"`
      : `(${ids.map((id) => `rule.id : "${id}"`).join(' or ')})`;
  return base ? `${base} AND ${clause}` : clause;
};

export const parseRuleLabelsFromMatcher = (matcher: string): string[] => {
  const found: string[] = [];
  const re = /rule\.labels\s*:\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null = re.exec(matcher);
  while (m !== null) {
    found.push(m[1]);
    m = re.exec(matcher);
  }
  return found;
};
