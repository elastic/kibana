/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { EbtTelemetryClient } from './client';
import {
  SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
} from './constants';

describe('EbtTelemetryClient', () => {
  let analyticsService: jest.Mocked<AnalyticsServiceSetup>;
  let client: EbtTelemetryClient;

  beforeEach(() => {
    analyticsService = {
      reportEvent: jest.fn(),
      registerEventType: jest.fn(),
      registerShipper: jest.fn(),
      registerContextProvider: jest.fn(),
      removeContextProvider: jest.fn(),
      optIn: jest.fn(),
      telemetryCounter$: {} as any,
    };
    client = new EbtTelemetryClient(analyticsService);
  });

  describe('startTrackingEndpointLatency', () => {
    it('does not track latency for endpoints not in the allow list', () => {
      const finishTracking = client.startTrackingEndpointLatency({
        name: 'test-stream',
        endpoint: 'GET /api/streams/not-allowed',
      });

      finishTracking();

      expect(analyticsService.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('trackSignificantEventsQueriesGenerated', () => {
    it('tracks significant events queries generated events', () => {
      client.trackSignificantEventsQueriesGenerated({
        count: 5,
        connector_id: 'test-connector',
        input_tokens_used: 300,
        output_tokens_used: 150,
        cached_tokens_used: 20,
        duration_ms: 1200,
        stream_name: 'test-stream',
        stream_type: 'wired',
        tool_usage: {
          get_stream_features: {
            calls: 1,
            failures: 0,
            latency_ms: 100,
          },
          add_queries: {
            calls: 1,
            failures: 0,
            latency_ms: 100,
          },
        },
      });

      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
        {
          count: 5,
          connector_id: 'test-connector',
          input_tokens_used: 300,
          output_tokens_used: 150,
          cached_tokens_used: 20,
          duration_ms: 1200,
          stream_name: 'test-stream',
          stream_type: 'wired',
          tool_usage: {
            get_stream_features: {
              calls: 1,
              failures: 0,
              latency_ms: 100,
            },
            add_queries: {
              calls: 1,
              failures: 0,
              latency_ms: 100,
            },
          },
        }
      );
    });
  });

  describe('trackSignificantEventsDetectionScan', () => {
    it('tracks a detection change-point scan event', () => {
      client.trackSignificantEventsDetectionScan({
        took_ms: 42,
        duration_ms: 120,
        rules_scanned: 24,
        alerting_engine: 'v2',
        alerts_source_index: '.rule-events',
        lookback: 'now-30m',
        bucket_interval: '30s',
        space_id: 'default',
      });

      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
        {
          took_ms: 42,
          duration_ms: 120,
          rules_scanned: 24,
          alerting_engine: 'v2',
          alerts_source_index: '.rule-events',
          lookback: 'now-30m',
          bucket_interval: '30s',
          space_id: 'default',
        }
      );
    });
  });
});
