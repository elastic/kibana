/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_KI_ATTRIBUTE_ARRAY_VALUES,
  MAX_KI_ATTRIBUTE_VALUE_LENGTH,
} from '../../../common/step_types/ki';
import type { KiVerifierContext, KnowledgeIndicator } from '../types';

/** KI attribute carrying the ES|QL to verify: a query string or array of query strings. */
export const ESQL_ATTRIBUTE_KEY = 'esql';

// Aligned with the KI attribute schema bounds so queries accepted there are never rejected here.
export const MAX_ESQL_QUERIES = MAX_KI_ATTRIBUTE_ARRAY_VALUES;
export const MAX_ESQL_QUERY_LENGTH = MAX_KI_ATTRIBUTE_VALUE_LENGTH;

const REASON_QUERY_PREVIEW_LENGTH = 200;

const describeAttribute = (key: string): string => `attributes.${key}`;

/** Returns whether the KI contains the ES|QL attribute. */
export const hasEsqlAttribute = (ki: KnowledgeIndicator, _context: KiVerifierContext): boolean =>
  ki.attributes?.[ESQL_ATTRIBUTE_KEY] !== undefined;

export const previewQuery = (query: string): string =>
  query.length > REASON_QUERY_PREVIEW_LENGTH
    ? `${query.slice(0, REASON_QUERY_PREVIEW_LENGTH)}…`
    : query;

export interface EsqlQueryRef {
  source: string;
  query: string;
}

/** Returns a failure reason for an oversized query. */
export const getOversizedQueryFailure = ({ source, query }: EsqlQueryRef): string | undefined =>
  query.length > MAX_ESQL_QUERY_LENGTH
    ? `${source}: ES|QL query "${previewQuery(
        query
      )}" exceeds the maximum length of ${MAX_ESQL_QUERY_LENGTH} characters`
    : undefined;

export type EsqlQueriesResult =
  /** Valid queries and malformed-attribute failures collected in one pass. */
  | { ok: true; queries: EsqlQueryRef[]; failures: string[] }
  /** Extraction stopped because the total query count exceeded the limit. */
  | { ok: false; reason: string };

/** Extracts trimmed ES|QL queries and malformed-attribute failures from configured attributes. */
export const getEsqlQueries = (
  ki: KnowledgeIndicator,
  context: KiVerifierContext
): EsqlQueriesResult => {
  const { logger } = context;
  const queries: EsqlQueryRef[] = [];
  const failures: string[] = [];

  for (const key of [ESQL_ATTRIBUTE_KEY]) {
    const source = describeAttribute(key);
    const value = ki.attributes?.[key];

    if (value === undefined) {
      logger.debug(`KI carries no '${source}'; skipping it for ES|QL verification`);
      continue;
    }

    const candidates = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null;

    if (!candidates || candidates.length === 0) {
      failures.push(
        `${source} must be a non-empty ES|QL query string or a non-empty array of query strings`
      );
      continue;
    }

    const invalidIndexes = candidates.flatMap((entry, index) =>
      typeof entry === 'string' && entry.trim().length > 0 ? [] : [index]
    );
    if (invalidIndexes.length > 0) {
      failures.push(
        `${source} must contain only non-empty query strings (invalid at index ${invalidIndexes.join(
          ', '
        )})`
      );
      continue;
    }

    queries.push(
      ...candidates
        .filter((entry): entry is string => typeof entry === 'string')
        .map((query) => ({ source, query: query.trim() }))
    );
  }

  if (queries.length > MAX_ESQL_QUERIES) {
    return {
      ok: false,
      reason: `KI carries ${queries.length} ES|QL queries; the maximum is ${MAX_ESQL_QUERIES}`,
    };
  }

  return { ok: true, queries, failures };
};
