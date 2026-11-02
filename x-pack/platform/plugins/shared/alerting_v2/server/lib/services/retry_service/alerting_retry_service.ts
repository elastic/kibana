/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fullJitterBackoffFactory } from '@kbn/response-ops-retry-service';
import { errors } from '@elastic/elasticsearch';
import { injectable } from 'inversify';

import type { LoggerServiceContract } from '../logger_service/logger_service';
import { EsTransientRetryService } from './es_transient_retry_service';

const backOffFactory = fullJitterBackoffFactory({
  baseDelay: 250,
  maxBackoffTime: 1000,
});

export interface RetryOptions {
  /**
   * The caller's subsystem logger. Retry warnings are written through it so they
   * carry the caller's `log.logger` and bound labels.
   */
  logger: LoggerServiceContract;
}

export interface IRetryService {
  retry<T>(callback: () => Promise<T>, options: RetryOptions): Promise<T>;
}

/**
 * Retry wrapper used by alerting_v2 services.
 *
 * Note: RetryService instances keep internal attempt state; create a new one per operation.
 */
@injectable()
export class AlertingRetryService implements IRetryService {
  public async retry<T>(callback: () => Promise<T>, { logger }: RetryOptions): Promise<T> {
    const retryService = new EsTransientRetryService(logger, backOffFactory);

    return retryService.retryWithBackoff(async () => {
      try {
        return await callback();
      } catch (e) {
        // Preserve Elasticsearch client errors and Error instances as-is.
        if (e instanceof errors.ResponseError || e instanceof Error) {
          throw e;
        }

        throw new Error(`Elasticsearch error: ${String(e)}`);
      }
    });
  }
}
