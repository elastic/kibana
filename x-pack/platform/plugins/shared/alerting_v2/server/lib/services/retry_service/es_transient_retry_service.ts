/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetryService } from '@kbn/response-ops-retry-service';
import { errors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { EsConcurrentModificationError } from './es_concurrent_modification_error';
import { EsUnacknowledgedError } from './es_unacknowledged_error';

/**
 * Whether an error is a transient Elasticsearch failure: connection/timeout failures,
 * retryable response status codes, unacknowledged cluster-state mutations, and resources
 * modified concurrently by another node.
 */
export const isTransientEsError = (error: Error): boolean => {
  if (error instanceof EsUnacknowledgedError || error instanceof EsConcurrentModificationError) {
    return true;
  }
  return error instanceof errors.ElasticsearchClientError && isRetryableEsClientError(error);
};

/**
 * Retry service that retries transient Elasticsearch errors (see `isTransientEsError`).
 */
export class EsTransientRetryService extends RetryService {
  protected isRetryableError(error: Error): boolean {
    return isTransientEsError(error);
  }
}
