/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryReporter } from '@kbn/response-ops-retry-service';
import { RetryService, fullJitterBackoffFactory } from '@kbn/response-ops-retry-service';
import { errors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { injectable } from 'inversify';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { EsConcurrentModificationError } from './es_concurrent_modification_error';
import { EsUnacknowledgedError } from './es_unacknowledged_error';
import type { IRetryService, RetryOptions } from './types';

const MAX_ATTEMPTS = 3;

const backOffFactory = fullJitterBackoffFactory({
  baseDelay: 250,
  maxBackoffTime: 1000,
});

const createAlertingRetryReporter = (logger: LoggerServiceContract): RetryReporter => ({
  onAttempt: () => {},
  onRetry: (error, attempt) => {
    logger.warn({
      message: `Transient Elasticsearch error, retrying (attempt ${attempt} of ${MAX_ATTEMPTS})`,
      code: ALERTING_LOG_CODES.RETRY_ATTEMPT_FAILED,
      error,
    });
  },
  onSettled: () => {},
});

const toError = (e: unknown): Error => {
  // Preserve Elasticsearch client errors and Error instances as-is.
  if (e instanceof errors.ResponseError || e instanceof Error) {
    return e;
  }

  return new Error(`Elasticsearch error: ${String(e)}`);
};

/**
 * Retries transient Elasticsearch errors: connection/timeout failures, retryable
 * response status codes, unacknowledged cluster-state mutations, and resources
 * modified concurrently by another node. Each retry is logged through the caller's
 * logger so it carries the caller's `log.logger` and bound labels.
 */
@injectable()
export class EsTransientRetryService extends RetryService implements IRetryService {
  constructor() {
    super(backOffFactory, MAX_ATTEMPTS);
  }

  public retry<T>(callback: () => Promise<T>, { logger }: RetryOptions): Promise<T> {
    return this.retryWithBackoff(async () => {
      try {
        return await callback();
      } catch (e) {
        throw toError(e);
      }
    }, createAlertingRetryReporter(logger));
  }

  protected isRetryableError(error: Error): boolean {
    if (error instanceof EsUnacknowledgedError || error instanceof EsConcurrentModificationError) {
      return true;
    }

    return error instanceof errors.ElasticsearchClientError && isRetryableEsClientError(error);
  }
}
