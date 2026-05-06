/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetryService } from '@kbn/response-ops-retry-service';
import { errors } from '@elastic/elasticsearch';

/**
 * Retry service that retries transient Elasticsearch transport errors.
 */
export class EsTransientRetryService extends RetryService {
  protected isRetryableError(error: Error): boolean {
    if (!(error instanceof errors.ResponseError)) {
      return false;
    }

    const status = error.meta.statusCode;
    return status === 408 || status === 429 || status === 503 || status === 504;
  }
}
