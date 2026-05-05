/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { castArray } from 'lodash';

type DslFilter = NonNullable<QueryDslQueryContainer>;

// This is intentionally not a generic Query DSL -> KQL converter. The eval
// fixtures currently use a small DSL subset for deterministic sampling filters,
// and unsupported clauses should fail loudly so new fixture shapes are reviewed
// before being run through ES|QL's KQL() function.
export function samplingFilterDslToKql(filter: QueryDslQueryContainer): string {
  if (!filter) {
    throw new Error('samplingFilterDslToKql: unsupported DSL filter shape: undefined');
  }

  if (filter.match_all) {
    return '*';
  }

  if (filter.term) {
    const [field, value] = getSingleEntry(filter.term, filter);
    return `${field}: ${quoteKqlValue(extractQueryValue(value))}`;
  }

  if (filter.match_phrase) {
    const [field, value] = getSingleEntry(filter.match_phrase, filter);
    return `${field}: ${quoteKqlValue(extractQueryValue(value))}`;
  }

  if (filter.match) {
    const [field, value] = getSingleEntry(filter.match, filter);
    return `${field}: ${quoteKqlValue(extractQueryValue(value))}`;
  }

  if (filter.bool) {
    const filterClauses = castArray(filter.bool.filter ?? []).filter(isDslFilter);
    const mustClauses = castArray(filter.bool.must ?? []).filter(isDslFilter);
    const mustNotClauses = castArray(filter.bool.must_not ?? []).filter(isDslFilter);
    const shouldClauses = castArray(filter.bool.should ?? []).filter(isDslFilter);
    const conjunction = [
      ...filterClauses.map(samplingFilterDslToKql),
      ...mustClauses.map(samplingFilterDslToKql),
      ...mustNotClauses.map((clause) => `NOT (${samplingFilterDslToKql(clause)})`),
    ].filter(Boolean);
    const disjunction = shouldClauses.length
      ? [`(${shouldClauses.map(samplingFilterDslToKql).join(' OR ')})`]
      : [];

    return [...conjunction, ...disjunction].join(' AND ') || '*';
  }

  throw new Error(
    `samplingFilterDslToKql: unsupported DSL filter shape: ${JSON.stringify(filter)}`
  );
}

function getSingleEntry(
  value: Record<string, unknown>,
  originalFilter: DslFilter
): [string, unknown] {
  const entry = Object.entries(value)[0];
  if (!entry) {
    throw new Error(
      `samplingFilterDslToKql: unsupported DSL filter shape: ${JSON.stringify(originalFilter)}`
    );
  }
  return entry;
}

function isDslFilter(filter: QueryDslQueryContainer | undefined): filter is DslFilter {
  return filter !== undefined;
}

function extractQueryValue(value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    if ('value' in value) {
      return value.value;
    }
    if ('query' in value) {
      return value.query;
    }
  }

  return value;
}

function quoteKqlValue(value: unknown): string {
  if (typeof value === 'string') {
    // Escape backslashes before quotes — the KQL grammar (grammar.peggy:230)
    // treats `\\` as an escaped backslash and `\"` as an escaped quote inside a
    // quoted string. Escaping quotes first would emit `\"` and the second pass
    // would then double the just-added backslash, breaking the quote escape.
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  return String(value);
}
