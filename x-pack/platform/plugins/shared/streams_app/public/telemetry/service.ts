/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  streamsAIGrokSuggestionAcceptedEventType,
  streamsAIGrokSuggestionLatencyEventType,
  streamsAssetClickEventType,
  streamsAssetCountEventType,
} from './events';
import { StreamsTelemetryClient } from './client';

export class StreamsTelemetryService {
  private analytics?: AnalyticsServiceSetup;

  constructor() {}

  public setup(analytics: AnalyticsServiceSetup) {
    this.analytics = analytics;
    this.analytics.registerEventType(streamsAssetCountEventType);
    this.analytics.registerEventType(streamsAssetClickEventType);
    this.analytics.registerEventType(streamsAIGrokSuggestionLatencyEventType);
    this.analytics.registerEventType(streamsAIGrokSuggestionAcceptedEventType);
  }

  public getClient() {
    if (!this.analytics) {
      throw new Error('Analytics service is not available.');
    }

    return new StreamsTelemetryClient(this.analytics);
  }
}
