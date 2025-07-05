/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, EventTypeOpts, LogMeta, Logger } from '@kbn/core/server';
import { IMetadataSender } from './sender.types';

export class MetadataSender implements IMetadataSender {
  private readonly logger: Logger;
  private analytics?: AnalyticsServiceStart;

  constructor(logger: Logger) {
    this.logger = logger.get(MetadataSender.name);
  }

  public setup() {}

  public start(analytics: AnalyticsServiceStart) {
    this.logger.debug('Starting sender');
    this.analytics = analytics;
  }

  public reportEBT<T>(eventTypeOpts: EventTypeOpts<T>, eventData: T): void {
    if (!this.analytics) {
      throw Error('analytics is unavailable');
    }

    this.logger.debug('Reporting event', { eventType: eventTypeOpts.eventType } as LogMeta);
    this.analytics.reportEvent(eventTypeOpts.eventType, eventData as object);
  }
}
