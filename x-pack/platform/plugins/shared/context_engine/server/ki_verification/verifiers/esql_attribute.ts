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

/** The KI attribute the ES|QL verifiers read when a run configures no attributes. */
export const ESQL_ATTRIBUTE_KEY = 'esql';

// Aligned with the KI attribute schema bounds so queries accepted there are never rejected here.
export const MAX_ESQL_QUERIES = MAX_KI_ATTRIBUTE_ARRAY_VALUES;
export const MAX_ESQL_QUERY_LENGTH = MAX_KI_ATTRIBUTE_VALUE_LENGTH;

const REASON_QUERY_PREVIEW_LENGTH = 200;

/** The attribute names a run inspects, defaulting to `esql`. */
export const resolveEsqlAttributeKeys = ({ esqlAttributes }: KiVerifierContext): string[] =>
  esqlAttributes && esqlAttributes.length > 0 ? esqlAttributes : [ESQL_ATTRIBUTE_KEY];

/** How an attribute is named in failure reasons. */
const describeAttribute = (key: string): string => `attributes.${key}`;

/**
 * Whether the KI carries a value in any configured attribute. A configured
 * attribute the KI does not have is skipped rather than failed, so a KI
 * carrying none of them is simply not applicable.
 */
export const hasEsqlAttribute = (ki: KnowledgeIndicator, context: KiVerifierContext): boolean =>
  resolveEsqlAttributeKeys(context).some((key) => ki.attributes?.[key] !== undefined);

export const previewQuery = (query: string): string =>
  query.length > REASON_QUERY_PREVIEW_LENGTH
    ? `${query.slice(0, REASON_QUERY_PREVIEW_LENGTH)}…`
    : query;

/** One query to verify, tagged with the KI attribute it came from. */
export interface EsqlQueryRef {
  /** The attribute name, as it appears in failure reasons. */
  source: string;
  query: string;
}

/**
 * The failure message for a query that exceeds {@link MAX_ESQL_QUERY_LENGTH},
 * or `undefined` when it is within bounds. Verifiers record it and skip the
 * query rather than aborting the whole KI.
 */
export const getOversizedQueryFailure = ({ source, query }: EsqlQueryRef): string | undefined =>
  query.length > MAX_ESQL_QUERY_LENGTH
    ? `${source}: ES|QL query "${previewQuery(
        query
      )}" exceeds the maximum length of ${MAX_ESQL_QUERY_LENGTH} characters`
    : undefined;

export type EsqlQueriesResult =
  | { ok: true; queries: EsqlQueryRef[] }
  | { ok: false; reason: string };

/**
 * Normalizes every configured attribute into a flat list of trimmed queries
 * tagged with their source. An attribute the KI does not carry is skipped; one
 * it carries with a malformed value (non-string, empty, or an array holding
 * non-string entries) is a verification failure.
 */
export const getEsqlQueries = (
  ki: KnowledgeIndicator,
  context: KiVerifierContext
): EsqlQueriesResult => {
  const { logger } = context;
  const queries: EsqlQueryRef[] = [];

  for (const key of resolveEsqlAttributeKeys(context)) {
    const source = describeAttribute(key);
    const value = ki.attributes?.[key];

    if (value === undefined) {
      logger.debug(`KI carries no '${source}'; skipping it for ES|QL verification`);
      continue;
    }

    const candidates = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null;

    if (!candidates || candidates.length === 0) {
      return {
        ok: false,
        reason: `${source} must be a non-empty ES|QL query string or a non-empty array of query strings`,
      };
    }

    const invalidIndexes = candidates.flatMap((entry, index) =>
      typeof entry === 'string' && entry.trim().length > 0 ? [] : [index]
    );
    if (invalidIndexes.length > 0) {
      return {
        ok: false,
        reason: `${source} must contain only non-empty query strings (invalid at index ${invalidIndexes.join(
          ', '
        )})`,
      };
    }

    queries.push(
      ...candidates
        .filter((entry): entry is string => typeof entry === 'string')
        .map((query) => ({ source, query: query.trim() }))
    );
  }

  // Bounded across every configured attribute, not per attribute, so adding
  // attributes cannot multiply the work a single verification run does.
  if (queries.length > MAX_ESQL_QUERIES) {
    return {
      ok: false,
      reason: `KI carries ${queries.length} ES|QL queries; the maximum is ${MAX_ESQL_QUERIES}`,
    };
  }

  return { ok: true, queries };
};
