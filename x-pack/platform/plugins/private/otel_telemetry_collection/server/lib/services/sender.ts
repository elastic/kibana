/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, LogMeta, Logger } from '@kbn/core/server';
import { OTEL_PER_SERVICE_EVENT } from '../ebt/events';
import type { OtelPerServiceResult } from './types';

export class OtelTelemetrySender {
  private readonly logger: Logger;

  constructor(logger: Logger, private readonly analytics: AnalyticsServiceStart) {
    this.logger = logger.get(OtelTelemetrySender.name);
  }

  public report(results: OtelPerServiceResult[], maxElementsPerEvent: number): void {
    if (results.length === 0 || maxElementsPerEvent <= 0) {
      return;
    }

    const batchTotal = Math.ceil(results.length / maxElementsPerEvent);

    for (let i = 0; i < batchTotal; i++) {
      const chunk = results.slice(i * maxElementsPerEvent, (i + 1) * maxElementsPerEvent);
      this.analytics.reportEvent(OTEL_PER_SERVICE_EVENT.eventType, {
        batch_index: i,
        batch_total: batchTotal,
        results: chunk,
      });
    }

    this.logger.info('Reported otel_per_service_stats', {
      resultCount: results.length,
      batchTotal,
    } as LogMeta);
  }
}
