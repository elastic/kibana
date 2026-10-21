/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../../streams/errors/status_error';

/** The response schema leaves `code` an open string, so the codes live here. */
export const STATS_ERROR_CODE = {
  notFound: 'not_found',
  forbidden: 'forbidden',
  unavailable: 'unavailable',
  timeout: 'timeout',
  error: 'error',
} as const;

export type StatsErrorCode = (typeof STATS_ERROR_CODE)[keyof typeof STATS_ERROR_CODE];

interface ErrorOptions {
  /** The original error, kept for logging. It never reaches the response. */
  cause?: unknown;
}

/**
 * The stats errors. Unlike the other streams errors, these end up as a field in a 200
 * response and not as an HTTP status: the client catches them at the boundary they are
 * scoped to and calls `toStatsError`. Extending `StatusError` means one that escapes is
 * still mapped to the right status by `createServerRoute`.
 *
 * One class with named constructors, because callers only read `code`. The messages are
 * written here and never hold a raw Elasticsearch body.
 */
export class UnitStatsError extends StatusError {
  private constructor(
    message: string,
    statusCode: number,
    public readonly code: StatsErrorCode,
    options?: ErrorOptions
  ) {
    super(message, statusCode);
    this.name = 'UnitStatsError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /** From the unit config alone. */
  static notFound(kind: 'destination' | 'processor') {
    return new UnitStatsError(
      `No ${kind} with this id in the unit.`,
      404,
      STATS_ERROR_CODE.notFound
    );
  }

  static forbidden(options?: ErrorOptions) {
    return new UnitStatsError(
      'The current user cannot read the stats stream.',
      403,
      STATS_ERROR_CODE.forbidden,
      options
    );
  }

  static unavailable(options?: ErrorOptions) {
    return new UnitStatsError(
      'Elasticsearch could not serve the stats query.',
      503,
      STATS_ERROR_CODE.unavailable,
      options
    );
  }

  /** 503, not 504: `createServerRoute` has no case for 504. */
  static timeout(what: string, options?: ErrorOptions) {
    return new UnitStatsError(
      `The ${what} query timed out.`,
      503,
      STATS_ERROR_CODE.timeout,
      options
    );
  }

  static queryFailed(what: string, options?: ErrorOptions) {
    return new UnitStatsError(`The ${what} query failed.`, 500, STATS_ERROR_CODE.error, options);
  }

  toStatsError(): StreamsUnit.StatsError {
    return { code: this.code, reason: this.message };
  }
}
