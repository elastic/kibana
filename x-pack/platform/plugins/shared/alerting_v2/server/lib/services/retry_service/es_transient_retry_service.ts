/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BackoffFactory, RetryReporter } from '@kbn/response-ops-retry-service';
import { RetryService } from '@kbn/response-ops-retry-service';
import { errors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { EsConcurrentModificationError } from './es_concurrent_modification_error';
import { EsUnacknowledgedError } from './es_unacknowledged_error';

const MAX_ATTEMPTS = 3;

/**
 * Reports retries through the caller's subsystem logger, so the warning carries the
 * caller's `log.logger`, its bound labels, a catalog code and the ECS error.
 */
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

/**
 * Retry service that retries transient Elasticsearch errors: connection/timeout
 * failures, retryable response status codes, unacknowledged cluster-state mutations,
 * and resources modified concurrently by another node.
 */
export class EsTransientRetryService extends RetryService {
  constructor(logger: LoggerServiceContract, backOffFactory: BackoffFactory) {
    super(createAlertingRetryReporter(logger), backOffFactory, MAX_ATTEMPTS);
  }

  protected isRetryableError(error: Error): boolean {
    if (error instanceof EsUnacknowledgedError || error instanceof EsConcurrentModificationError) {
      return true;
    }
    return error instanceof errors.ElasticsearchClientError && isRetryableEsClientError(error);
  }
}
