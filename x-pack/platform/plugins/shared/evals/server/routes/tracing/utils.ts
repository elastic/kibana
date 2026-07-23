/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { LogMeta } from '@kbn/logging';

/**
 * Escapes Elasticsearch wildcard metacharacters (`\`, `*`, `?`) in user input
 * so the literal characters are matched rather than interpreted as wildcards.
 */
export const escapeWildcard = (input: string): string =>
  input.replace(/[\\\*\?]/g, (ch) => `\\${ch}`);

interface EsErrorBody {
  error?: {
    type?: string;
    reason?: string;
    root_cause?: Array<{ type?: string; reason?: string }>;
  };
}

export interface EsErrorLogDetails {
  /** Human-readable summary suitable for the log message body. */
  message: string;
  /** Structured ECS-shaped metadata so failures remain queryable in logs. */
  meta: LogMeta;
}

/**
 * Normalizes a thrown value into a readable summary plus structured ECS
 * `error.*` metadata. For Elasticsearch `ResponseError`s it surfaces the
 * underlying error `type` and `reason` (preferring the deepest `root_cause`),
 * which a plain `String(error)` swallows.
 */
export const getEsErrorLogDetails = (error: unknown): EsErrorLogDetails => {
  if (error instanceof EsErrors.ResponseError) {
    const esError = (error.body as EsErrorBody | undefined)?.error;
    const rootCause = esError?.root_cause?.[0];
    const type = rootCause?.type ?? esError?.type ?? error.name;
    const reason = rootCause?.reason ?? esError?.reason ?? error.message;
    const { statusCode } = error;

    const message = [type, reason, statusCode ? `(status ${statusCode})` : undefined]
      .filter(Boolean)
      .join(': ');

    return {
      message,
      meta: {
        error: {
          type,
          message: reason,
          stack_trace: error.stack,
          code: statusCode !== undefined ? String(statusCode) : undefined,
        },
      },
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      meta: {
        error: {
          type: error.name,
          message: error.message,
          stack_trace: error.stack,
        },
      },
    };
  }

  const message = String(error);
  return {
    message,
    meta: { error: { message } },
  };
};
