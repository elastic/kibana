/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import { getESQLWithSafeLimit } from '@kbn/esql-utils';
import { isResponseError } from '@kbn/es-errors';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import {
  getEsqlQueries,
  getOversizedQueryFailure,
  hasEsqlAttribute,
  previewQuery,
} from './esql_attribute';
import type { KiVerifier } from '../types';

export const ESQL_EXECUTES_VERIFIER_ID = 'esql-valid-runtime';

/**
 * Row cap injected right after the source command, so a query is bounded before
 * any downstream work rather than after it. Verification only cares that a
 * query runs, never about what it returns.
 */
export const ESQL_EXECUTION_ROW_LIMIT = 1;

/**
 * Bounds a query for verification. `getESQLWithSafeLimit` parses the query, so a
 * KI whose ES|QL is malformed falls back to the query as written; Elasticsearch
 * then rejects it with a message at least as useful as anything we could add.
 */
const boundQuery = (query: string): string => {
  try {
    return getESQLWithSafeLimit(query, ESQL_EXECUTION_ROW_LIMIT);
  } catch {
    return query;
  }
};

const formatEsError = (error: errors.ResponseError): string => {
  const details = error.body as ElasticsearchErrorDetails | undefined;
  const { type, reason } = details?.error ?? {};
  if (type) {
    return reason ? `${type}: ${reason}` : type;
  }
  return reason ?? error.message;
};

/**
 * Executes a KI's ES|QL against the cluster to catch what static validation
 * cannot: unknown indices and fields, type errors, and any other rejection that
 * only surfaces once Elasticsearch plans and runs the query.
 */
export const createEsqlExecutesVerifier = (): KiVerifier => ({
  id: ESQL_EXECUTES_VERIFIER_ID,
  applies: hasEsqlAttribute,
  async verify(ki, context) {
    const { esClient, abortSignal } = context;
    const extracted = getEsqlQueries(ki, context);
    if (!extracted.ok) {
      return { passed: false, reason: extracted.reason };
    }

    const failures: string[] = [...extracted.failures];
    for (const queryRef of extracted.queries) {
      abortSignal?.throwIfAborted();

      const oversized = getOversizedQueryFailure(queryRef);
      if (oversized) {
        failures.push(oversized);
        continue;
      }

      const { source, query } = queryRef;
      try {
        const { is_partial: isPartial } = await esClient.esql.query(
          {
            query: boundQuery(query),
            // Shard failures come back on a 200 by default, which would pass a
            // query that did not actually run everywhere.
            allow_partial_results: false,
          },
          { signal: abortSignal }
        );
        // The request parameter above should have made this an error already, but
        // a cluster that reports partial results anyway has not told us the
        // query runs.
        if (isPartial) {
          failures.push(
            `${source}: ES|QL query "${previewQuery(
              query
            )}" returned partial results, so it did not run against every shard`
          );
        }
      } catch (error) {
        // A rejection from Elasticsearch is a statement about the query. Anything
        // else - a dropped connection, an aborted request - is a statement about
        // the run, so it propagates to the framework instead of failing the KI.
        if (!isResponseError(error)) {
          throw error;
        }
        failures.push(
          `${source}: ES|QL query "${previewQuery(query)}" failed to execute: ${formatEsError(
            error
          )}`
        );
      }
    }

    return failures.length > 0 ? { passed: false, reason: failures.join('\n') } : { passed: true };
  },
});
