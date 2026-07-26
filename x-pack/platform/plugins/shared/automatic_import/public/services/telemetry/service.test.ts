/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { AutomaticImportTelemetry } from './service';
import { AutomaticImportTelemetryEventType } from '../../../common';
import { telemetryEventsSchemas } from './events';

describe('AutomaticImportTelemetry', () => {
  let telemetry: AutomaticImportTelemetry;
  let mockAnalytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;

  beforeEach(() => {
    telemetry = new AutomaticImportTelemetry();
    mockAnalytics = analyticsServiceMock.createAnalyticsServiceSetup();
  });

  describe('setup()', () => {
    it('registers all event types from the schema', () => {
      telemetry.setup(mockAnalytics);

      const registeredEventTypes = mockAnalytics.registerEventType.mock.calls.map(
        ([{ eventType }]) => eventType
      );
      const expectedEventTypes = Object.keys(
        telemetryEventsSchemas
      ) as AutomaticImportTelemetryEventType[];

      expect(mockAnalytics.registerEventType).toHaveBeenCalledTimes(expectedEventTypes.length);
      expect(registeredEventTypes).toEqual(expect.arrayContaining(expectedEventTypes));
    });

    it('registers each event with the correct schema', () => {
      telemetry.setup(mockAnalytics);

      const pageLoadedCall = mockAnalytics.registerEventType.mock.calls.find(
        ([{ eventType }]) =>
          eventType === AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded
      );
      expect(pageLoadedCall).toBeDefined();
      expect(pageLoadedCall![0].schema).toEqual(
        telemetryEventsSchemas[AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded]
      );
    });
  });

  describe('start()', () => {
    it('throws if setup() was not called first', () => {
      expect(() => telemetry.start()).toThrow(
        'AutomaticImportTelemetry.setup() must be called before start()'
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

      service.reportEvent(AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded, {
        sessionId: 'test-session',
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded,
        { sessionId: 'test-session' }
      );
    });
  });
});
