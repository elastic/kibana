/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceStart, EventTypeOpts } from '@kbn/core/server';

export interface IMetadataSender {
  setup(): void;
  start(analytics: AnalyticsServiceStart): void;
  reportEBT: <T>(eventTypeOpts: EventTypeOpts<T>, eventData: T) => void;
}
