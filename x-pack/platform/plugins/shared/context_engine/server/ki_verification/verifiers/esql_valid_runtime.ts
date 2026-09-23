/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import { appendToESQLQuery } from '@kbn/esql-utils';
import { isResponseError } from '@kbn/es-errors';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import { ESQL_VALID_RUNTIME_VERIFIER_ID } from '../../../common/ki_verification';
import {
  getEsqlQueries,
  getOversizedQueryFailure,
  hasEsqlAttribute,
  previewQuery,
} from './esql_attribute';
import { withRetry } from './retry';
import type { KiVerifier } from '../types';

export { ESQL_VALID_RUNTIME_VERIFIER_ID };

export const ESQL_EXECUTION_ROW_LIMIT = 1;

const MAX_QUERY_ATTEMPTS = 3;

const boundQuery = (query: string): string =>
  appendToESQLQuery(query, `| LIMIT ${ESQL_EXECUTION_ROW_LIMIT}`);

const formatEsError = (error: errors.ResponseError): string => {
  const details = error.body as ElasticsearchErrorDetails | undefined;
  const { type, reason } = details?.error ?? {};
  if (type) {
    return reason ? `${type}: ${reason}` : type;
  }
  return reason ?? error.message;
};

/** Creates a verifier that executes ES|QL queries against Elasticsearch. */
export const createEsqlValidRuntimeVerifier = (retryDelayMs = 200): KiVerifier => ({
  id: ESQL_VALID_RUNTIME_VERIFIER_ID,
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
        const { is_partial: isPartial } = await withRetry(
          () =>
            esClient.esql.query(
              { query: boundQuery(query), allow_partial_results: false },
              { signal: abortSignal }
            ),
          { maxAttempts: MAX_QUERY_ATTEMPTS, delayMs: retryDelayMs, signal: abortSignal }
        );

        // Treat an unexpected partial response as a verification failure.
        if (isPartial) {
          failures.push(
            `${source}: ES|QL query "${previewQuery(
              query
            )}" returned partial results, so it did not run against every shard`
          );
        }
      } catch (error) {
        // Re-throw non-response errors such as transport failures and cancellation.
        if (!isResponseError(error)) {
          throw error;
        }
        // Re-throw infrastructure errors: authorization, rate limiting, server errors.
        // Only 400 query/content errors (parsing_exception, verification_exception) are KI failures.
        if (error.statusCode !== 400) {
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
