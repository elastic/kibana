/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';

import type {
  AutomaticImportTelemetryEventType,
  AutomaticImportTelemetryEventPayload,
} from '../../../common/telemetry/types';
import { telemetryEventsSchemas } from './events';

/**
 * Type-safe telemetry service for reporting Automatic Import analytics events.
 */
export interface AutomaticImportTelemetryService {
  /**
   * Report a telemetry event with type-checked payload.
   */
  reportEvent: <T extends AutomaticImportTelemetryEventType>(
    eventType: T,
    eventData: AutomaticImportTelemetryEventPayload<T>
  ) => void;
}

export class AutomaticImportTelemetry {
  private analytics?: AnalyticsServiceSetup;

  public setup(analytics: AnalyticsServiceSetup): void {
    this.analytics = analytics;

    Object.entries(telemetryEventsSchemas).forEach(([eventType, schema]) => {
      analytics.registerEventType({ eventType, schema });
    });
  }

  public start(): AutomaticImportTelemetryService {
    const reportEvent = this.analytics?.reportEvent.bind(this.analytics);

    if (!reportEvent) {
      throw new Error(
        'AutomaticImportTelemetry.setup() must be called before start(). ' +
          'Ensure telemetry.setup(core.analytics) is called during plugin setup.'
      );
    }

    return { reportEvent };
  }
}
