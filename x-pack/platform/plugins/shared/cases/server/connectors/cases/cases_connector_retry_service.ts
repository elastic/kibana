/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { BackoffFactory } from '../../common/retry_service/types';

import { CasesConnectorError } from './cases_connector_error';
import { RetryService } from '../../common/retry_service';

export class CasesConnectorRetryService extends RetryService {
  /**
   * 409 - Conflict
   * 429 - Too Many Requests
   * 503 - ES Unavailable
   *
   * Full list of errors: src/core/packages/saved-objects/server/src/saved_objects_error_helpers.ts
   */
  private readonly RETRY_ERROR_STATUS_CODES: number[] = [409, 429, 503];

  constructor(logger: Logger, backOffFactory: BackoffFactory, maxAttempts: number = 10) {
    super(logger, backOffFactory, 'CasesConnector', maxAttempts);
  }

  protected isRetryableError(error: Error) {
    if (
      error instanceof CasesConnectorError &&
      this.RETRY_ERROR_STATUS_CODES.includes(error.statusCode)
    ) {
      return true;
    }

    this.logger.debug(`[CasesConnector][isRetryableError] Error is not retryable`, {
      tags: ['case-connector:retry-error'],
    });

    return false;
  }
}
