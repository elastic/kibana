/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { UnitStatsError } from './unit_stats_error';

/**
 * Maps a failed search to a stats error. A 403 is a ResponseError with security_exception
 * and a timeout is a TimeoutError. The original error is kept as the cause, for logging.
 */
export const toSearchError = (error: unknown, what: string): UnitStatsError => {
  if (error instanceof UnitStatsError) return error;
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
