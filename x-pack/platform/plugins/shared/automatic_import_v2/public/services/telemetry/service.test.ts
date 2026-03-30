/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { AIV2Telemetry } from './service';
import { AIV2TelemetryEventType } from '../../../common';
import { telemetryEventsSchemas } from './events';

describe('AIV2Telemetry', () => {
  let telemetry: AIV2Telemetry;
  let mockAnalytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;

  beforeEach(() => {
    telemetry = new AIV2Telemetry();
    mockAnalytics = analyticsServiceMock.createAnalyticsServiceSetup();
  });

  describe('setup()', () => {
    it('registers all event types from the schema', () => {
      telemetry.setup(mockAnalytics);

      const registeredEventTypes = mockAnalytics.registerEventType.mock.calls.map(
        ([{ eventType }]) => eventType
      );
      const expectedEventTypes = Object.keys(telemetryEventsSchemas) as AIV2TelemetryEventType[];

      expect(mockAnalytics.registerEventType).toHaveBeenCalledTimes(expectedEventTypes.length);
      expect(registeredEventTypes).toEqual(expect.arrayContaining(expectedEventTypes));
    });

    it('registers each event with the correct schema', () => {
      telemetry.setup(mockAnalytics);

      const pageLoadedCall = mockAnalytics.registerEventType.mock.calls.find(
        ([{ eventType }]) => eventType === AIV2TelemetryEventType.CreateIntegrationPageLoaded
      );
      expect(pageLoadedCall).toBeDefined();
      expect(pageLoadedCall![0].schema).toEqual(
        telemetryEventsSchemas[AIV2TelemetryEventType.CreateIntegrationPageLoaded]
      );
    });
  });

  describe('start()', () => {
    it('throws if setup() was not called first', () => {
      expect(() => telemetry.start()).toThrow(
        'AIV2Telemetry.setup() must be called before start()'
      );
    });

    it('returns a service with reportEvent after setup()', () => {
      telemetry.setup(mockAnalytics);
      const service = telemetry.start();

      expect(service).toBeDefined();
      expect(typeof service.reportEvent).toBe('function');
    });

    it('reportEvent delegates to analytics.reportEvent', () => {
      telemetry.setup(mockAnalytics);
      const service = telemetry.start();

      service.reportEvent(AIV2TelemetryEventType.CreateIntegrationPageLoaded, {
        sessionId: 'test-session',
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AIV2TelemetryEventType.CreateIntegrationPageLoaded,
        { sessionId: 'test-session' }
      );
    });
  });
});
