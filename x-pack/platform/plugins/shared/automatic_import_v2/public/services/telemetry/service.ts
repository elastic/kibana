/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';

import type { AIV2TelemetryEventType, AIV2EventPayload } from '../../../common/telemetry/types';
import { telemetryEventsSchemas } from './events';

/**
 * Type-safe telemetry service for reporting AIV2 events.
 */
export interface AIV2TelemetryService {
  /**
   * Report a telemetry event with type-checked payload.
   */
  reportEvent: <T extends AIV2TelemetryEventType>(
    eventType: T,
    eventData: AIV2EventPayload<T>
  ) => void;
}

export class AIV2Telemetry {
  private analytics?: AnalyticsServiceSetup;

  public setup(analytics: AnalyticsServiceSetup): void {
    this.analytics = analytics;

    Object.entries(telemetryEventsSchemas).forEach(([eventType, schema]) => {
      analytics.registerEventType({ eventType, schema });
    });
  }

  public start(): AIV2TelemetryService {
    const reportEvent = this.analytics?.reportEvent.bind(this.analytics);

    if (!reportEvent) {
      throw new Error(
        'AIV2Telemetry.setup() must be called before start(). ' +
          'Ensure telemetry.setup(core.analytics) is called during plugin setup.'
      );
    }

    return { reportEvent };
  }
}
