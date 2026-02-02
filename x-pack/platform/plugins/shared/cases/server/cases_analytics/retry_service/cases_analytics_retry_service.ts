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
import { RetryService } from '@kbn/response-ops-retry-service';

export class CasesAnalyticsRetryService extends RetryService {
  constructor(logger: Logger, backOffFactory: BackoffFactory, maxAttempts: number = 10) {
    super(logger, backOffFactory, 'CasesAnalytics', maxAttempts);
  }

  protected isRetryableError(error: EsErrors.ElasticsearchClientError) {
    if (isRetryableEsClientError(error)) {
      return true;
    }

    this.logger.debug(`[${this.serviceName}][isRetryableError] Error is not retryable`, {
      tags: ['cai:retry-error'],
    });

    return false;
  }
}
