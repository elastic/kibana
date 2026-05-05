/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Curated allow-list of dot-prefixed index / alias / data-stream patterns that
 * Agent Builder is willing to expose to end users and to the LLM index selection
 * flow.
 *
 * This is an INTENTIONAL allow-list. Adding a pattern here makes the matching
 * resources visible to LLM tool selection and to the UI index picker in the
 * `index_search` tool. Review additions carefully — consider whether:
 *   - The data is meant to be queried by end users (not internal plumbing).
 *   - Access is already authorized via Elasticsearch index privileges; we do
 *     not re-check Kibana feature access here.
 *   - The pattern is narrow enough that it won't accidentally match unrelated
 *     future dot-prefixed resources.
 *
 * Patterns use a simplified glob syntax: `*` matches any sequence of characters
 * (including `.`), everything else is literal. See {@link isVisibleSearchSource}.
 */
export const DOT_INDEX_ALLOW_LIST_PATTERNS: readonly string[] = [
  '.alerts-*',
  '.ml-anomalies-*',
  '.slo-observability.*',
  '.entities.*',
  '.lists',
  '.items',
  '.lists-*',
  '.items-*',
  '.siem-signals-*',
  '.monitoring-*',
];

const ALLOW_LIST_REGEXES: readonly RegExp[] = DOT_INDEX_ALLOW_LIST_PATTERNS.map(patternToRegex);

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export const isVisibleSearchSource = (name: string): boolean => {
  if (typeof name !== 'string' || name.length === 0) {
    return false;
  }

  const localSegment = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name;

  if (localSegment.length === 0) {
    return false;
  }

  if (!localSegment.startsWith('.')) {
    return true;
  }

  return ALLOW_LIST_REGEXES.some((regex) => regex.test(localSegment));
};
