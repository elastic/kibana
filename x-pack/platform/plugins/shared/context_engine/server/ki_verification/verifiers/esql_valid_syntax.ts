/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ESQLMessage } from '@kbn/esql-language';
import type { EditorError } from '@elastic/esql/types';
import type { KiVerifier, KnowledgeIndicator } from '../types';

export const ESQL_VALID_SYNTAX_VERIFIER_ID = 'esql-valid-syntax';

/** KI attribute carrying the ES|QL to verify: a query string or array of query strings. */
export const ESQL_ATTRIBUTE_KEY = 'esql';

export const MAX_ESQL_QUERIES = 100;
export const MAX_ESQL_QUERY_LENGTH = 10_000;

const REASON_QUERY_PREVIEW_LENGTH = 200;

const extractQueries = (ki: KnowledgeIndicator): string[] => {
  const value = ki.attributes?.[ESQL_ATTRIBUTE_KEY];
  const candidates = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  return candidates
    .filter((query): query is string => typeof query === 'string')
    .map((query) => query.trim())
    .filter((query) => query.length > 0);
};

const formatValidationError = (error: ESQLMessage | EditorError): string =>
  'text' in error
    ? `${error.text} (at position ${error.location.min}-${error.location.max})`
    : `${error.message} (at line ${error.startLineNumber}:${error.startColumn})`;

const previewQuery = (query: string): string =>
  query.length > REASON_QUERY_PREVIEW_LENGTH
    ? `${query.slice(0, REASON_QUERY_PREVIEW_LENGTH)}…`
    : query;

/** Statically validates a KI's ES|QL. */
export const createEsqlValidSyntaxVerifier = (): KiVerifier => ({
  id: ESQL_VALID_SYNTAX_VERIFIER_ID,
  applies: (ki) => extractQueries(ki).length > 0,
  async verify(ki, { abortSignal }) {
    const queries = extractQueries(ki);
    if (queries.length > MAX_ESQL_QUERIES) {
      return {
        passed: false,
        reason: `KI carries ${queries.length} ES|QL queries; the maximum is ${MAX_ESQL_QUERIES}`,
      };
    }

    const failures: string[] = [];
    for (const query of queries) {
      abortSignal?.throwIfAborted();
      if (query.length > MAX_ESQL_QUERY_LENGTH) {
        failures.push(
          `ES|QL query "${previewQuery(
            query
          )}" exceeds the maximum length of ${MAX_ESQL_QUERY_LENGTH} characters`
        );
        continue;
      }
      const { errors } = await validateQuery(query);
      if (errors.length > 0) {
        failures.push(
          `ES|QL query "${previewQuery(query)}" is invalid: ${errors
            .map(formatValidationError)
            .join('; ')}`
        );
      }
    }
    return failures.length > 0 ? { passed: false, reason: failures.join('\n') } : { passed: true };
  },
});
