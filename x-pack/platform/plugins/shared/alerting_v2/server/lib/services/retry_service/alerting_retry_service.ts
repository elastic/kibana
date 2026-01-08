/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger as KibanaLogger } from '@kbn/logging';
import { Logger as LoggerToken } from '@kbn/core-di';
import { fullJitterBackoffFactory } from '@kbn/response-ops-retry-service';
import { errors } from '@elastic/elasticsearch';
import { inject, injectable } from 'inversify';

import { EsTransientRetryService } from './es_transient_retry_service';

const backOffFactory = fullJitterBackoffFactory({
  baseDelay: 250,
  maxBackoffTime: 1000,
});

function getEsErrorStatusCode(error: unknown): number | undefined {
  return error instanceof errors.ResponseError ? error.meta.statusCode : undefined;
}

/**
 * Retry wrapper used by alerting_v2 services.
 *
 * Note: RetryService instances keep internal attempt state; create a new one per operation.
 */
@injectable()
export class AlertingRetryService {
  constructor(@inject(LoggerToken) private readonly logger: KibanaLogger) {}

  public async retry<T>(callback: () => Promise<T>): Promise<T> {
    const retryService = new EsTransientRetryService(this.logger, backOffFactory, 'alerting_v2', 3);

    return retryService.retryWithBackoff(async () => {
      try {
        return await callback();
      } catch (e) {
        // Preserve Elasticsearch client errors as-is (they already expose statusCode / meta).
        if (e instanceof errors.ResponseError) {
          throw e;
        }

        if (e instanceof Error) {
          throw e;
        }

        const statusCode = getEsErrorStatusCode(e);
        const statusSuffix = statusCode != null ? ` (statusCode=${statusCode})` : '';
        const err = new Error(`Elasticsearch error${statusSuffix}: ${String(e)}`);
        if (statusCode != null) {
          // Add for downstream logging that checks `error.statusCode` (e.g. RetryService warnings)
          (err as unknown as { statusCode?: number }).statusCode = statusCode;
        }
        throw err;
      }
    });
  }
}
