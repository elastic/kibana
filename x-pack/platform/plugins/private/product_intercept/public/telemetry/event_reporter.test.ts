/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptTelemetry } from './event_reporter';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';

describe('event reporter', () => {
  it('exports a setup and start function', () => {
    // Test implementation
    const eventReporter = new PromptTelemetry();

    expect(eventReporter).toHaveProperty('setup', expect.any(Function));
    expect(eventReporter).toHaveProperty('start', expect.any(Function));
  });

  it('should register events types for intercept', () => {
    const eventReporter = new PromptTelemetry();

    const analyticsSetup = analyticsServiceMock.createAnalyticsServiceSetup();

    eventReporter.setup({
      analytics: analyticsSetup,
    });

    expect(analyticsSetup.registerEventType).toHaveBeenCalledTimes(3);
  });

  it('should return reporting functions on start', () => {
    const eventReporter = new PromptTelemetry();

    const analyticsSetup = analyticsServiceMock.createAnalyticsServiceSetup();
    const analyticsStart = analyticsServiceMock.createAnalyticsServiceStart();

    eventReporter.setup({
      analytics: analyticsSetup,
    });

    const reportingFunctions = eventReporter.start({ analytics: analyticsStart });

    expect(reportingFunctions).toHaveProperty(
      'reportInterceptInteractionTermination',
      expect.any(Function)
    );
    expect(reportingFunctions).toHaveProperty(
      'reportInterceptInteractionProgress',
      expect.any(Function)
    );
    expect(reportingFunctions).toHaveProperty('reportTriggerFetchError', expect.any(Function));
  });

  describe('reportInterceptInteractionTermination', () => {
    it('should report the interaction', () => {
      const eventReporter = new PromptTelemetry();

      const analyticsSetup = analyticsServiceMock.createAnalyticsServiceSetup();
      const analyticsStart = analyticsServiceMock.createAnalyticsServiceStart();

      eventReporter.setup({
        analytics: analyticsSetup,
      });

      const reportingFunctions = eventReporter.start({ analytics: analyticsStart });

      reportingFunctions.reportInterceptInteractionTermination({
        interceptRunId: 1,
        interactionType: 'dismissal',
      });

      expect(analyticsStart.reportEvent).toHaveBeenCalledWith(
        'product_intercept_termination_interaction',
        {
          interaction_run_id: String(1),
          interaction_type: 'dismissal',
        }
      );
    });
  });

  describe('reportInterceptInteractionProgress', () => {
    it('should report the interaction', () => {
      const eventReporter = new PromptTelemetry();

      const analyticsSetup = analyticsServiceMock.createAnalyticsServiceSetup();
      const analyticsStart = analyticsServiceMock.createAnalyticsServiceStart();

      eventReporter.setup({
        analytics: analyticsSetup,
      });

      const reportingFunctions = eventReporter.start({ analytics: analyticsStart });

      reportingFunctions.reportInterceptInteractionProgress({
        interceptRunId: 1,
        metricId: 'satisfaction',
        value: 5,
      });

      expect(analyticsStart.reportEvent).toHaveBeenCalledWith(
        'product_intercept_interaction_progress',
        {
          interaction_run_id: String(1),
          interaction_metric: 'satisfaction',
          interaction_metric_value: 5,
        }
      );
    });
  });

  describe('reportTriggerFetchError', () => {
    it('should report the error', () => {
      const eventReporter = new PromptTelemetry();

      const analyticsSetup = analyticsServiceMock.createAnalyticsServiceSetup();
      const analyticsStart = analyticsServiceMock.createAnalyticsServiceStart();

      eventReporter.setup({
        analytics: analyticsSetup,
      });

      const reportingFunctions = eventReporter.start({ analytics: analyticsStart });

      reportingFunctions.reportTriggerFetchError({
        errorMessage: 'Fetch failed',
      });

      expect(analyticsStart.reportEvent).toHaveBeenCalledWith(
        'product_intercept_trigger_fetch_error',
        {
          trigger_fetch_error_message: 'Fetch failed',
        }
      );
    });
  });
});
