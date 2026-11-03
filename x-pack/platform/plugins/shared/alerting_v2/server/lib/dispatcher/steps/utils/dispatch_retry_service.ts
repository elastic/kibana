/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { fullJitterBackoffFactory } from '@kbn/response-ops-retry-service';
import { EsTransientRetryService } from '../../../services/retry_service';
import {
  DISPATCH_RETRY_BASE_DELAY_MS,
  DISPATCH_RETRY_BUDGET_MS,
  DISPATCH_RETRY_MAX_BACKOFF_MS,
} from '../../constants';
import { isTransientDispatchError } from './is_transient_dispatch_error';

const backOffFactory = fullJitterBackoffFactory({
  baseDelay: DISPATCH_RETRY_BASE_DELAY_MS,
  maxBackoffTime: DISPATCH_RETRY_MAX_BACKOFF_MS,
});

/**
 * Retries one dispatch operation while its error is transient, the tick signal has not fired and
 * the next backoff still fits in `DISPATCH_RETRY_BUDGET_MS`. Holds attempt state: use one instance
 * per operation.
 */
export class DispatchRetryService extends EsTransientRetryService {
  private readonly startedAt = Date.now();
  private retries = 0;

  constructor(logger: Logger, private readonly signal: AbortSignal, maxRetries: number) {
    super(logger, backOffFactory, 'alerting_v2_dispatch', maxRetries);
  }

  protected isRetryableError(error: Error): boolean {
    if (this.signal.aborted || !this.nextBackoffFitsBudget() || !isTransientDispatchError(error)) {
      return false;
    }
    this.retries += 1;
    return true;
  }

  private nextBackoffFitsBudget(): boolean {
    const nextMaxBackoff = Math.min(
      DISPATCH_RETRY_MAX_BACKOFF_MS,
      DISPATCH_RETRY_BASE_DELAY_MS * 2 ** this.retries
    );
    return Date.now() - this.startedAt + nextMaxBackoff <= DISPATCH_RETRY_BUDGET_MS;
  }
}
