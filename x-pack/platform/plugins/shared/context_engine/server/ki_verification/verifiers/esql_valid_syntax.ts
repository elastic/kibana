/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ESQLMessage } from '@kbn/esql-language';
import type { EditorError } from '@elastic/esql/types';
import {
  MAX_KI_ATTRIBUTE_ARRAY_VALUES,
  MAX_KI_ATTRIBUTE_VALUE_LENGTH,
} from '../../../common/step_types/ki';
import type { KiVerifier, KnowledgeIndicator } from '../types';

export const ESQL_VALID_SYNTAX_VERIFIER_ID = 'esql-valid-syntax';

/** KI attribute carrying the ES|QL to verify: a query string or array of query strings. */
export const ESQL_ATTRIBUTE_KEY = 'esql';

// Aligned with the KI attribute schema bounds so queries accepted there are never rejected here.
export const MAX_ESQL_QUERIES = MAX_KI_ATTRIBUTE_ARRAY_VALUES;
export const MAX_ESQL_QUERY_LENGTH = MAX_KI_ATTRIBUTE_VALUE_LENGTH;

const REASON_QUERY_PREVIEW_LENGTH = 200;

const getEsqlValue = (ki: KnowledgeIndicator): unknown => ki.attributes?.[ESQL_ATTRIBUTE_KEY];

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
  applies: (ki) => getEsqlValue(ki) !== undefined,
  async verify(ki, { abortSignal }) {
    const value = getEsqlValue(ki);
    const candidates = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null;
    if (!candidates || candidates.length === 0) {
      return {
        passed: false,
        reason: `attributes.${ESQL_ATTRIBUTE_KEY} must be a non-empty ES|QL query string or a non-empty array of query strings`,
      };
    }
    if (candidates.length > MAX_ESQL_QUERIES) {
      return {
        passed: false,
        reason: `KI carries ${candidates.length} ES|QL queries; the maximum is ${MAX_ESQL_QUERIES}`,
      };
    }
    const invalidIndexes = candidates.flatMap((entry, index) =>
      typeof entry === 'string' && entry.trim().length > 0 ? [] : [index]
    );
    if (invalidIndexes.length > 0) {
      return {
        passed: false,
        reason: `attributes.${ESQL_ATTRIBUTE_KEY} must contain only non-empty query strings (invalid at index ${invalidIndexes.join(
          ', '
        )})`,
      };
    }
    const queries = candidates
      .filter((entry): entry is string => typeof entry === 'string')
      .map((query) => query.trim());

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
