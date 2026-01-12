/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { CloudConnectTelemetryService as CloudConnectTelemetryClient } from './client';
import {
  clusterConnectedEventType,
  clusterDisconnectedEventType,
  serviceEnabledEventType,
  serviceDisabledEventType,
  linkClickedEventType,
} from './events';

export class CloudConnectTelemetryService {
  private analytics?: AnalyticsServiceSetup;

  public setup(analytics: AnalyticsServiceSetup) {
    this.analytics = analytics;

    // Register all event types
    this.analytics.registerEventType(clusterConnectedEventType);
    this.analytics.registerEventType(clusterDisconnectedEventType);
    this.analytics.registerEventType(serviceEnabledEventType);
    this.analytics.registerEventType(serviceDisabledEventType);
    this.analytics.registerEventType(linkClickedEventType);
  }

  public getClient(): CloudConnectTelemetryClient {
    if (!this.analytics) {
      throw new Error('Analytics service is not available.');
    }
    return new CloudConnectTelemetryClient(this.analytics);
  }
}
