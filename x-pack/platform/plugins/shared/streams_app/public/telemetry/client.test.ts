/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { StreamsTelemetryClient } from './client';
import { STREAMS_SIGNIFICANT_EVENTS_INSIGHT_FEEDBACK_EVENT_TYPE } from './constants';

describe('StreamsTelemetryClient', () => {
  let analyticsService: jest.Mocked<AnalyticsServiceSetup>;
  let client: StreamsTelemetryClient;

  beforeEach(() => {
    analyticsService = {
      reportEvent: jest.fn(),
      registerEventType: jest.fn(),
      registerShipper: jest.fn(),
      registerContextProvider: jest.fn(),
      removeContextProvider: jest.fn(),
      optIn: jest.fn(),
      telemetryCounter$: new Observable(),
    };
    client = new StreamsTelemetryClient(analyticsService);
  });

  describe('trackInsightFeedback', () => {
    it('reports a helpful feedback event', () => {
      client.trackInsightFeedback({
        feedback: 'helpful',
        insight_id: 'insight-123',
        insight_title: 'High error rate in payments service',
        insight_impact: 'critical',
      });

      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        STREAMS_SIGNIFICANT_EVENTS_INSIGHT_FEEDBACK_EVENT_TYPE,
        {
          feedback: 'helpful',
          insight_id: 'insight-123',
          insight_title: 'High error rate in payments service',
          insight_impact: 'critical',
        }
      );
    });

    it('reports a not_helpful feedback event', () => {
      client.trackInsightFeedback({
        feedback: 'not_helpful',
        insight_id: 'insight-456',
        insight_title: 'Unusual latency spike detected',
        insight_impact: 'medium',
      });

      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        STREAMS_SIGNIFICANT_EVENTS_INSIGHT_FEEDBACK_EVENT_TYPE,
        {
          feedback: 'not_helpful',
          insight_id: 'insight-456',
          insight_title: 'Unusual latency spike detected',
          insight_impact: 'medium',
        }
      );
    });
  });
});
