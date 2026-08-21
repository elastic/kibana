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
import type { KnowledgeIndicator } from '../types';

/** KI attribute carrying the ES|QL to verify: a query string or array of query strings. */
export const ESQL_ATTRIBUTE_KEY = 'esql';

// Aligned with the KI attribute schema bounds so queries accepted there are never rejected here.
export const MAX_ESQL_QUERIES = MAX_KI_ATTRIBUTE_ARRAY_VALUES;
export const MAX_ESQL_QUERY_LENGTH = MAX_KI_ATTRIBUTE_VALUE_LENGTH;

const REASON_QUERY_PREVIEW_LENGTH = 200;

const getEsqlValue = (ki: KnowledgeIndicator): unknown => ki.attributes?.[ESQL_ATTRIBUTE_KEY];

/** Whether the KI carries an `attributes.esql` value at all, malformed or not. */
export const hasEsqlAttribute = (ki: KnowledgeIndicator): boolean => getEsqlValue(ki) !== undefined;

export const previewQuery = (query: string): string =>
  query.length > REASON_QUERY_PREVIEW_LENGTH
    ? `${query.slice(0, REASON_QUERY_PREVIEW_LENGTH)}…`
    : query;

/**
 * The failure message for a query that exceeds {@link MAX_ESQL_QUERY_LENGTH},
 * or `undefined` when it is within bounds. Verifiers record it and skip the
 * query rather than aborting the whole KI.
 */
export const getOversizedQueryFailure = (query: string): string | undefined =>
  query.length > MAX_ESQL_QUERY_LENGTH
    ? `ES|QL query "${previewQuery(
        query
      )}" exceeds the maximum length of ${MAX_ESQL_QUERY_LENGTH} characters`
    : undefined;

export type EsqlQueriesResult = { ok: true; queries: string[] } | { ok: false; reason: string };

/**
 * Normalizes `attributes.esql` into a list of trimmed queries. A present but
 * malformed value (non-string, empty, or an array holding non-string entries)
 * is a verification failure rather than a reason to skip the KI.
 */
export const getEsqlQueries = (ki: KnowledgeIndicator): EsqlQueriesResult => {
  const value = getEsqlValue(ki);
  const candidates = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null;

  if (!candidates || candidates.length === 0) {
    return {
      ok: false,
      reason: `attributes.${ESQL_ATTRIBUTE_KEY} must be a non-empty ES|QL query string or a non-empty array of query strings`,
    };
  }

  if (candidates.length > MAX_ESQL_QUERIES) {
    return {
      ok: false,
      reason: `KI carries ${candidates.length} ES|QL queries; the maximum is ${MAX_ESQL_QUERIES}`,
    };
  }

  const invalidIndexes = candidates.flatMap((entry, index) =>
    typeof entry === 'string' && entry.trim().length > 0 ? [] : [index]
  );
  if (invalidIndexes.length > 0) {
    return {
      ok: false,
      reason: `attributes.${ESQL_ATTRIBUTE_KEY} must contain only non-empty query strings (invalid at index ${invalidIndexes.join(
        ', '
      )})`,
    };
  }

  return {
    ok: true,
    queries: candidates
      .filter((entry): entry is string => typeof entry === 'string')
      .map((query) => query.trim()),
  };
};
