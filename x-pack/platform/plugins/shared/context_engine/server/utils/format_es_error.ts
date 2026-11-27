/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import { isResponseError } from '@kbn/es-errors';

/**
 * Extracts a safe, human-readable message from an ES `ResponseError`.
 *
 * `error.message` is not safe to forward as-is: when the response body has no
 * `error.type` (e.g. a proxy in front of ES, or a non-standard error shape),
 * the ES client sets `message` to the JSON-stringified response body, which
 * can include unrelated internal detail. This reads `type`/`reason` directly
 * off the body instead, and only ever falls back to a generic message.
 */
export const formatEsError = (error: errors.ResponseError): string => {
  const details = error.body as ElasticsearchErrorDetails | undefined;
  const { type, reason } = details?.error ?? {};
  if (type) {
    return reason ? `${type}: ${reason}` : type;
  }
  if (reason) {
    return reason;
  }
  return 'Elasticsearch returned an unexpected error';
};

/** Formats any error for client-facing messages, sanitizing ES `ResponseError`s. */
export const formatErrorMessage = (error: unknown): string =>
  isResponseError(error)
    ? formatEsError(error)
    : error instanceof Error
      ? error.message
      : String(error);
