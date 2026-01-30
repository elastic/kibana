/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { EbtTelemetryClient } from './client';
import {
  STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
  STREAMS_FEATURES_IDENTIFIED_EVENT_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_QUERIES_GENERATED_EVENT_TYPE,
  STREAMS_SYSTEM_IDENTIFICATION_IDENTIFIED_EVENT_TYPE,
  STREAMS_INSIGHTS_GENERATED_EVENT_TYPE,
} from './constants';

describe('EbtTelemetryClient', () => {
  let analytics: jest.Mocked<Pick<AnalyticsServiceSetup, 'registerEventType' | 'reportEvent'>>;
  let client: EbtTelemetryClient;

  beforeEach(() => {
    analytics = {
      registerEventType: jest.fn(),
      reportEvent: jest.fn(),
    };
    client = new EbtTelemetryClient(analytics as unknown as AnalyticsServiceSetup);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackDescriptionGenerated', () => {
    it('reports event with all fields including cached_tokens_used', () => {
      const params = {
        input_tokens_used: 100,
        output_tokens_used: 50,
        cached_tokens_used: 25,
        stream_name: 'logs.test',
        stream_type: 'wired' as const,
      };

      client.trackDescriptionGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
        params
      );
    });

    it('reports event without cached_tokens_used when not provided', () => {
      const params = {
        input_tokens_used: 100,
        output_tokens_used: 50,
        stream_name: 'logs.test',
        stream_type: 'classic' as const,
      };

      client.trackDescriptionGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
        params
      );
      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
        expect.not.objectContaining({ cached_tokens_used: expect.anything() })
      );
    });

    it('reports event with cached_tokens_used as 0', () => {
      const params = {
        input_tokens_used: 100,
        output_tokens_used: 50,
        cached_tokens_used: 0,
        stream_name: 'logs.test',
        stream_type: 'wired' as const,
      };

      client.trackDescriptionGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
        expect.objectContaining({ cached_tokens_used: 0 })
      );
    });
  });

  describe('trackSystemsIdentified', () => {
    it('reports event with all fields including cached_tokens_used', () => {
      const params = {
        count: 5,
        input_tokens_used: 200,
        output_tokens_used: 100,
        cached_tokens_used: 50,
        stream_name: 'logs.kubernetes',
        stream_type: 'wired' as const,
      };

      client.trackSystemsIdentified(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_SYSTEM_IDENTIFICATION_IDENTIFIED_EVENT_TYPE,
        params
      );
    });

    it('reports event without cached_tokens_used when not provided', () => {
      const params = {
        count: 3,
        input_tokens_used: 150,
        output_tokens_used: 75,
        stream_name: 'logs.nginx',
        stream_type: 'classic' as const,
      };

      client.trackSystemsIdentified(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_SYSTEM_IDENTIFICATION_IDENTIFIED_EVENT_TYPE,
        params
      );
    });
  });

  describe('trackSignificantEventsQueriesGenerated', () => {
    it('reports event with all fields including cached_tokens_used', () => {
      const params = {
        count: 10,
        systems_count: 3,
        input_tokens_used: 500,
        output_tokens_used: 250,
        cached_tokens_used: 100,
        stream_name: 'logs.apache',
        stream_type: 'wired' as const,
      };

      client.trackSignificantEventsQueriesGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_SIGNIFICANT_EVENTS_QUERIES_GENERATED_EVENT_TYPE,
        params
      );
    });

    it('reports event without cached_tokens_used when not provided', () => {
      const params = {
        count: 5,
        systems_count: 2,
        input_tokens_used: 300,
        output_tokens_used: 150,
        stream_name: 'logs.mysql',
        stream_type: 'classic' as const,
      };

      client.trackSignificantEventsQueriesGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_SIGNIFICANT_EVENTS_QUERIES_GENERATED_EVENT_TYPE,
        params
      );
    });
  });

  describe('trackFeaturesIdentified', () => {
    it('reports event with all fields including cached_tokens_used', () => {
      const params = {
        count: 8,
        input_tokens_used: 400,
        output_tokens_used: 200,
        cached_tokens_used: 80,
        stream_name: 'logs.system',
        stream_type: 'wired' as const,
      };

      client.trackFeaturesIdentified(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_FEATURES_IDENTIFIED_EVENT_TYPE,
        params
      );
    });

    it('reports event without cached_tokens_used when not provided', () => {
      const params = {
        count: 4,
        input_tokens_used: 250,
        output_tokens_used: 125,
        stream_name: 'logs.custom',
        stream_type: 'classic' as const,
      };

      client.trackFeaturesIdentified(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_FEATURES_IDENTIFIED_EVENT_TYPE,
        params
      );
    });

    it('reports event with cached_tokens_used as 0', () => {
      const params = {
        count: 2,
        input_tokens_used: 100,
        output_tokens_used: 50,
        cached_tokens_used: 0,
        stream_name: 'logs.redis',
        stream_type: 'wired' as const,
      };

      client.trackFeaturesIdentified(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_FEATURES_IDENTIFIED_EVENT_TYPE,
        expect.objectContaining({ cached_tokens_used: 0 })
      );
    });
  });

  describe('trackInsightsGenerated', () => {
    it('reports event with all fields including cached_tokens_used', () => {
      const params = {
        input_tokens_used: 300,
        output_tokens_used: 150,
        cached_tokens_used: 60,
      };

      client.trackInsightsGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_INSIGHTS_GENERATED_EVENT_TYPE,
        params
      );
    });

    it('reports event without cached_tokens_used when not provided', () => {
      const params = {
        input_tokens_used: 200,
        output_tokens_used: 100,
      };

      client.trackInsightsGenerated(params);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        STREAMS_INSIGHTS_GENERATED_EVENT_TYPE,
        params
      );
    });
  });
});
