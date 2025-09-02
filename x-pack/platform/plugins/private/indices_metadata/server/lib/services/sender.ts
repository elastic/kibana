/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, EventTypeOpts, LogMeta, Logger } from '@kbn/core/server';

export class MetadataSender {
  private readonly logger: Logger;

  constructor(logger: Logger, private readonly analytics: AnalyticsServiceStart) {
    this.logger = logger.get(MetadataSender.name);
  }

  public reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    this.logger.debug('Reporting event', { eventType: eventTypeOpts.eventType } as LogMeta);
    this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
  }
}
