/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

import type { BackoffFactory } from '@kbn/response-ops-retry-service';
import { RetryService, createLoggerRetryReporter } from '@kbn/response-ops-retry-service';

const SERVICE_NAME = 'CasesAnalytics';

export class CasesAnalyticsRetryService extends RetryService {
  constructor(
    private readonly logger: Logger,
    backOffFactory: BackoffFactory,
    maxAttempts: number = 10
  ) {
    super(createLoggerRetryReporter(logger, SERVICE_NAME), backOffFactory, maxAttempts);
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
