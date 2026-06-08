/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';

const RETRIES = 4;
const MIN_TIMEOUT_MS = 2_000;
const MAX_TIMEOUT_MS = 30_000;
const FACTOR = 2;

const CLUSTER_EVENT_TIMEOUT_EXCEPTION = 'process_cluster_event_timeout_exception';

const isClusterEventTimeoutError = (err: unknown): boolean => {
  if (!(err instanceof EsErrors.ResponseError)) {
    return false;
  }
  if (err.body?.error?.type === CLUSTER_EVENT_TIMEOUT_EXCEPTION) {
    return true;
  }
  if (Array.isArray(err.body?.error?.root_cause)) {
    return err.body.error.root_cause.some(
      (cause: { type?: string }) => cause.type === CLUSTER_EVENT_TIMEOUT_EXCEPTION
    );
  }
  return false;
};

const isTooManyRequestsError = (err: unknown): boolean =>
  err instanceof EsErrors.ResponseError && err.statusCode === 429;

/**
 * Wraps an async operation that updates a data stream with jittered exponential-backoff retry
 * logic that triggers specifically on `process_cluster_event_timeout_exception` and 429 errors.
 * All other errors abort immediately and propagate unchanged.
 *
 * Confined to the package-install code path (does not touch retryTransientEsErrors).
 */
export const retryDataStreamUpdateOnClusterEventTimeout = async <T>(
  operation: () => Promise<T>,
  { logger, dataStreamName }: { logger: Logger; dataStreamName: string }
): Promise<T> => {
  return pRetry(operation, {
    retries: RETRIES,
    factor: FACTOR,
    minTimeout: MIN_TIMEOUT_MS,
    maxTimeout: MAX_TIMEOUT_MS,
    randomize: true,
    onFailedAttempt: (err) => {
      if (!isClusterEventTimeoutError(err) && !isTooManyRequestsError(err)) {
        throw new pRetry.AbortError(err);
      }
      logger.warn(
        `Retrying data stream update for [${dataStreamName}] after cluster event timeout (attempt ${
          err.attemptNumber
        }/${RETRIES + 1}): ${err.message}`
      );
    },
  });
};
