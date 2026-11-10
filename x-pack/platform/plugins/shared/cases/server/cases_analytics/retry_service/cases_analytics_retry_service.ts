/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

import type { BackoffFactory, RetryReporter } from '@kbn/response-ops-retry-service';
import { RetryService, createLoggerRetryReporter } from '@kbn/response-ops-retry-service';

const SERVICE_NAME = 'CasesAnalytics';

export class CasesAnalyticsRetryService extends RetryService {
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

  protected isRetryableError(error: EsErrors.ElasticsearchClientError) {
    if (isRetryableEsClientError(error)) {
      return true;
    }

    this.logger.debug(`[${SERVICE_NAME}][isRetryableError] Error is not retryable`, {
      tags: ['cai:retry-error'],
    });

    return false;
  }
}
