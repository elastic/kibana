/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { EventMetric, EventFieldType, eventTypes } from './event_definitions';

export class InterceptTelemetry {
  private reportEvent?: AnalyticsServiceStart['reportEvent'];

  public setup({ analytics }: { analytics: AnalyticsServiceSetup }) {
    eventTypes.forEach((eventType) => {
      analytics.registerEventType(eventType);
    });

    return {};
  }

  public start({ analytics }: { analytics: AnalyticsServiceStart }) {
    this.reportEvent = analytics.reportEvent;

    return {
      reportInterceptRegistration: this.reportInterceptRegistration.bind(this),
      reportInterceptOverload: this.reportInterceptOverload.bind(this),
      reportInterceptInteraction: this.reportInterceptInteraction.bind(this),
    };
  }

  private reportInterceptRegistration({ interceptId }: { interceptId: string }) {
    this.reportEvent?.(EventMetric.INTERCEPT_REGISTRATION, {
      [EventFieldType.INTERCEPT_ID]: interceptId,
    });
  }

  private reportInterceptOverload({ interceptId }: { interceptId: string }) {
    this.reportEvent?.(EventMetric.INTERCEPT_OVERLOAD, {
      [EventFieldType.INTERCEPT_ID]: interceptId,
    });
  }

  private reportInterceptInteraction({
    interactionDuration,
    interactionType,
    interceptId,
  }: {
    interactionDuration: number;
    interactionType: string;
    interceptId: string;
  }) {
    this.reportEvent?.(EventMetric.INTERCEPT_TERMINATION_INTERACTION, {
      [EventFieldType.INTERACTION_TYPE]: interactionType,
      [EventFieldType.INTERCEPT_ID]: interceptId,
      [EventFieldType.INTERACTION_DURATION]: interactionDuration,
    });
  }
}
