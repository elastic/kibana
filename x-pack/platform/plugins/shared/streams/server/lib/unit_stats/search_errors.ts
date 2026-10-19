/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { StreamsUnit } from '@kbn/streams-schema';
import { FORBIDDEN_ERROR, UNAVAILABLE_ERROR, failedError, timeoutError } from './stats_errors';

/**
 * A missing stats stream means no data. A new unit has no stream until its first
 * document, and this API does not report on whether the telemetry pipeline is set up.
 */
export const isMissingStreamError = (error: unknown): boolean =>
  error instanceof errors.ResponseError && error.statusCode === 404;

/**
 * Maps a failed search to an error. A 403 is a ResponseError with security_exception and
 * a timeout is a TimeoutError.
 */
export const errorForSearchFailure = (error: unknown, what: string): StreamsUnit.StatsError => {
  if (error instanceof errors.TimeoutError) {
    return timeoutError(what);
  }
  if (error instanceof errors.ResponseError) {
    if (error.statusCode === 403) return FORBIDDEN_ERROR;
    if (error.statusCode === 429 || error.statusCode === 503) return UNAVAILABLE_ERROR;
  }
  return failedError(what);
};
