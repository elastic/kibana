/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerEsqlViewsAnalyticsEvents } from './events_registration';
import { TelemetryClient } from './telemetry_client';
import type { EsqlViewsTelemetryClient } from './types';

/** Registers the ES|QL views event types and hands out a client to report them. */
export class TelemetryService {
  private analytics?: AnalyticsServiceSetup;

  public setup(analytics: AnalyticsServiceSetup): void {
    this.analytics = analytics;
    registerEsqlViewsAnalyticsEvents(analytics);
  }

  public start(): EsqlViewsTelemetryClient {
    if (!this.analytics) {
      throw new Error(
        'TelemetryService.setup() has not been invoked, be sure to call it before start().'
      );
    }

    return new TelemetryClient(this.analytics);
  }
}
