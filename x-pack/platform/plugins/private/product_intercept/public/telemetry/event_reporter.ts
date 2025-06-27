/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { EventMetric, EventFieldType, eventTypes } from './event_definitions';

export class PromptTelemetry {
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
      reportInterceptInteraction: this.reportInterceptTermination,
      reportInterceptInteractionProgress: this.reportInterceptInteractionProgress,
      reportTriggerFetchError: this.reportTriggerFetchError,
    };
  }

  private reportInterceptTermination({
    interactionType,
    interceptRunId,
  }: {
    interactionType: 'dismissal' | 'completion';
    interceptRunId: number;
  }) {
    this.reportEvent?.(EventMetric.PRODUCT_INTERCEPT_TERMINATION_INTERACTION, {
      [EventFieldType.INTERACTION_TYPE]: interactionType,
      [EventFieldType.INTERCEPT_RUN_ID]: String(interceptRunId),
    });
  }

  private reportInterceptInteractionProgress({
    interceptRunId,
    metricId,
    value,
  }: {
    interceptRunId: number;
    metricId: string;
    value: number;
  }) {
    this.reportEvent?.(EventMetric.PRODUCT_INTERCEPT_PROGRESS_INTERACTION, {
      [EventFieldType.INTERACTION_METRIC]: metricId,
      [EventFieldType.INTERACTION_METRIC_VALUE]: value,
      [EventFieldType.INTERCEPT_RUN_ID]: String(interceptRunId),
    });
  }

  private reportTriggerFetchError({ errorMessage }: { errorMessage: string }) {
    this.reportEvent?.(EventMetric.PRODUCT_INTERCEPT_TRIGGER_FETCH_ERROR, {
      [EventFieldType.TRIGGER_FETCH_ERROR_MESSAGE]: errorMessage,
    });
  }
}
