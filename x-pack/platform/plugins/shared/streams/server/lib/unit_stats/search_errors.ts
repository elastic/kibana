/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { UnitStatsError } from './unit_stats_error';

/**
 * A missing stats stream means no data. A new unit has no stream until its first
 * document, and this API does not report on whether the telemetry pipeline is set up.
 */
export const isMissingStreamError = (error: unknown): boolean =>
  error instanceof errors.ResponseError && error.statusCode === 404;

/**
 * Maps a failed search to a stats error. A 403 is a ResponseError with security_exception
 * and a timeout is a TimeoutError. The original error is kept as the cause, for logging.
 */
export const toSearchError = (error: unknown, what: string): UnitStatsError => {
  if (error instanceof errors.TimeoutError) {
    return UnitStatsError.timeout(what, { cause: error });
  }
  if (error instanceof errors.ResponseError) {
    if (error.statusCode === 403) return UnitStatsError.forbidden({ cause: error });
    if (error.statusCode === 429 || error.statusCode === 503) {
      return UnitStatsError.unavailable({ cause: error });
    }
  }
  return UnitStatsError.queryFailed(what, { cause: error });
};
