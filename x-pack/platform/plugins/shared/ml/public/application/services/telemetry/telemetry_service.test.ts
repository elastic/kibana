/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { TelemetryService } from './telemetry_service';
import { TrainedModelsTelemetryEventTypes } from './types';

describe('TelemetryService', () => {
  let analyticsMock: ReturnType<typeof coreMock.createSetup>['analytics'];
  let telemetryService: TelemetryService;

  beforeEach(() => {
    const core = coreMock.createSetup();
    analyticsMock = core.analytics;
    telemetryService = new TelemetryService();
  });

  describe('setup', () => {
    it('registers all trained models event types', () => {
      telemetryService.setup({ analytics: analyticsMock });

      const registeredEventTypes = (analyticsMock.registerEventType as jest.Mock).mock.calls.map(
        ([eventDef]) => eventDef.eventType
      );

      expect(registeredEventTypes).toContain(TrainedModelsTelemetryEventTypes.DEPLOYMENT_CREATED);
      expect(registeredEventTypes).toContain(TrainedModelsTelemetryEventTypes.MODEL_DOWNLOAD);
      expect(registeredEventTypes).toContain(TrainedModelsTelemetryEventTypes.DEPLOYMENT_UPDATED);
      expect(registeredEventTypes).toContain(TrainedModelsTelemetryEventTypes.MODEL_TESTED);
    });

    it('registers 4 event types in total', () => {
      telemetryService.setup({ analytics: analyticsMock });
      expect(analyticsMock.registerEventType).toHaveBeenCalledTimes(4);
    });
  });

  describe('start', () => {
    it('throws if setup has not been called', () => {
      expect(() => telemetryService.start()).toThrow();
    });

    it('returns a TelemetryClient after setup', () => {
      telemetryService.setup({ analytics: analyticsMock });
      const client = telemetryService.start();
      expect(client).toBeDefined();
      expect(typeof client.trackTrainedModelsDeploymentCreated).toBe('function');
    });
  });
});
