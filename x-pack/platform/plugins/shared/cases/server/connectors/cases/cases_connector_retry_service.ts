/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { BackoffFactory, RetryReporter } from '@kbn/response-ops-retry-service';
import { RetryService, createLoggerRetryReporter } from '@kbn/response-ops-retry-service';

import { CasesConnectorError } from './cases_connector_error';

const SERVICE_NAME = 'CasesConnector';

export class CasesConnectorRetryService extends RetryService {
  /**
   * 409 - Conflict
   * 429 - Too Many Requests
   * 503 - ES Unavailable
   *
   * Full list of errors: src/core/packages/saved-objects/server/src/saved_objects_error_helpers.ts
   */
  private readonly RETRY_ERROR_STATUS_CODES: number[] = [409, 429, 503];

  private readonly reporter: RetryReporter;

  constructor(
    private readonly logger: Logger,
    backOffFactory: BackoffFactory,
    maxAttempts: number = 10
  ) {
    super(backOffFactory, maxAttempts);
    this.reporter = createLoggerRetryReporter(logger, SERVICE_NAME);
  }

  public retryWithBackoff<T>(cb: () => Promise<T>): Promise<T> {
    return super.retryWithBackoff(cb, this.reporter);
  }

  protected isRetryableError(error: Error) {
    if (
      error instanceof CasesConnectorError &&
      this.RETRY_ERROR_STATUS_CODES.includes(error.statusCode)
    ) {
      return true;
    }

    this.logger.debug(`[${SERVICE_NAME}][isRetryableError] Error is not retryable`, {
      tags: ['case-connector:retry-error'],
    });

    return false;
  }
}
