/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import {
  streamsEndpointLatencyEventType,
  streamsStateErrorEventType,
  streamsSystemIdentificationIdentifiedEventType,
  streamsDescriptionGeneratedEventType,
  streamsSignificantEventsGeneratedEventType,
} from './events';
import { EbtTelemetryClient } from './client';

export class EbtTelemetryService {
  private analytics?: AnalyticsServiceSetup;

  constructor() {}

  public setup(analytics: AnalyticsServiceSetup) {
    this.analytics = analytics;
    this.analytics.registerEventType(streamsEndpointLatencyEventType);
    this.analytics.registerEventType(streamsStateErrorEventType);
    this.analytics.registerEventType(streamsSystemIdentificationIdentifiedEventType);
    this.analytics.registerEventType(streamsDescriptionGeneratedEventType);
    this.analytics.registerEventType(streamsSignificantEventsGeneratedEventType);
  }

  public getClient() {
    if (!this.analytics) {
      throw new Error('Analytics service is not available.');
    }
    return new EbtTelemetryClient(this.analytics);
  }
}
