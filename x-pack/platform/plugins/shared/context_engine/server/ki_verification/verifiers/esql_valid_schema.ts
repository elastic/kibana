/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import { isResponseError } from '@kbn/es-errors';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import { validateQuery } from '@kbn/esql-language';
import { getESQLWithSafeLimit } from '@kbn/esql-utils';
import {
  getEsqlQueries,
  getOversizedQueryFailure,
  hasEsqlAttribute,
  previewQuery,
} from './esql_attribute';
import { createEsqlSchemaCallbacks } from './esql_schema_callbacks';
import type { KiVerifier } from '../types';

export const ESQL_VALID_SCHEMA_VERIFIER_ID = 'esql-valid-schema';

const formatEsError = (error: errors.ResponseError): string => {
  const details = error.body as ElasticsearchErrorDetails | undefined;
  const { type, reason } = details?.error ?? {};
  if (type) {
    return reason ? `${type}: ${reason}` : type;
  }
  return reason ?? error.message;
};

const isMissingIndexError = (error: unknown): error is errors.ResponseError => {
  if (!isResponseError(error)) {
    return false;
  }
  const details = error.body as ElasticsearchErrorDetails | undefined;
  const { type, reason } = details?.error ?? {};
  return (
    (error.statusCode === 404 && type === 'index_not_found_exception') ||
    (error.statusCode === 400 &&
      type === 'verification_exception' &&
      reason?.includes('Unknown index') === true)
  );
};

const isEsqlVerificationError = (error: unknown): error is errors.ResponseError => {
  if (!isResponseError(error) || error.statusCode !== 400) {
    return false;
  }
  const details = error.body as ElasticsearchErrorDetails | undefined;
  return ['parsing_exception', 'verification_exception'].includes(details?.error?.type ?? '');
};

const forceSourceResolution = (query: string): string => {
  try {
    return getESQLWithSafeLimit(query, 0);
  } catch {
    return query;
  }
};

/** Resolves ES|QL index, field, and enrich-policy references against cluster metadata. */
export const createEsqlValidSchemaVerifier = (retryDelayMs = 200): KiVerifier => ({
  id: ESQL_VALID_SCHEMA_VERIFIER_ID,
  applies: hasEsqlAttribute,
  async verify(ki, context) {
    const { esClient, abortSignal } = context;
    const myOptions = context.options?.[ESQL_VALID_SCHEMA_VERIFIER_ID];
    const fieldVerification = myOptions?.field_verification ?? 'enabled';
    const extracted = getEsqlQueries(ki, context);
    if (!extracted.ok) {
      return { passed: false, reason: extracted.reason };
    }

    const failures: string[] = [...extracted.failures];
    const { callbacks } = createEsqlSchemaCallbacks({
      esClient,
      abortSignal,
      retryDelayMs,
    });

    for (const queryRef of extracted.queries) {
      abortSignal?.throwIfAborted();

      const oversized = getOversizedQueryFailure(queryRef);
      if (oversized) {
        failures.push(oversized);
        continue;
      }

      const { source, query } = queryRef;
      try {
        const validationCallbacks =
          fieldVerification === 'enabled'
            ? callbacks
            : {
                getColumnsFor: callbacks.getColumnsFor,
              };
        const { errors } = await validateQuery(forceSourceResolution(query), validationCallbacks);
        if (fieldVerification === 'enabled' && errors.length > 0) {
          failures.push(
            `${source}: ES|QL query "${previewQuery(query)}" is invalid: ${errors
              .map((error) => ('text' in error ? error.text : error.message))
              .join('; ')}`
          );
        }
      } catch (error) {
        if (isMissingIndexError(error)) {
          failures.push(
            `${source}: ES|QL query "${previewQuery(
              query
            )}" references indices that do not exist: ${formatEsError(error)}`
          );
          continue;
        }
        if (isEsqlVerificationError(error)) {
          failures.push(
            `${source}: ES|QL query "${previewQuery(query)}" is invalid: ${formatEsError(error)}`
          );
          continue;
        }
        throw error;
      }
    }

    return failures.length > 0 ? { passed: false, reason: failures.join('\n') } : { passed: true };
  },
});
