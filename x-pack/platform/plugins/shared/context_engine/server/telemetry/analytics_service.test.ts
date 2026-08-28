/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ContextEngineAnalyticsService } from './analytics_service';
import { CONTEXT_ENGINE_EVENT_TYPES, contextEngineServerEbtEvents } from './events';

describe('ContextEngineAnalyticsService', () => {
  let analytics: { registerEventType: jest.Mock; reportEvent: jest.Mock };
  let logger: { debug: jest.Mock };
  let service: ContextEngineAnalyticsService;

  beforeEach(() => {
    analytics = { registerEventType: jest.fn(), reportEvent: jest.fn() };
    logger = { debug: jest.fn() };
    service = new ContextEngineAnalyticsService(
      analytics as unknown as AnalyticsServiceSetup,
      logger as unknown as Logger
    );
  });

  describe('registerContextEngineEventTypes', () => {
    it('registers every context engine event type', () => {
      service.registerContextEngineEventTypes();

      expect(analytics.registerEventType).toHaveBeenCalledTimes(
        contextEngineServerEbtEvents.length
      );
      const registered = analytics.registerEventType.mock.calls.map(([event]) => event.eventType);
      expect(registered).toEqual(Object.values(CONTEXT_ENGINE_EVENT_TYPES));
    });
  });

  describe('reportKiWrite', () => {
    it.each([
      ['create', CONTEXT_ENGINE_EVENT_TYPES.KiCreate],
      ['update', CONTEXT_ENGINE_EVENT_TYPES.KiUpdate],
      ['delete', CONTEXT_ENGINE_EVENT_TYPES.KiDelete],
    ] as const)('reports a %s event with the expected fields', (action, eventType) => {
      service.reportKiWrite({ action, aiIndexId: 'my-index', managed: false, outcome: 'success' });

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(eventType, {
        ai_index_id: 'my-index',
        managed: false,
        outcome: 'success',
      });
    });

    it('omits managed when the managed state is unknown', () => {
      service.reportKiWrite({ action: 'create', aiIndexId: 'my-index', outcome: 'failure' });

      const [, payload] = analytics.reportEvent.mock.calls[0];
      expect(payload.ai_index_id).toBe('my-index');
      expect(payload).not.toHaveProperty('managed');
    });

    it('reports the error type, not the message, on failure', () => {
      service.reportKiWrite({
        action: 'update',
        aiIndexId: 'my-index',
        outcome: 'failure',
        errorType: 'NotFoundError',
      });

      const [, payload] = analytics.reportEvent.mock.calls[0];
      expect(payload).toEqual({
        ai_index_id: 'my-index',
        outcome: 'failure',
        error_type: 'NotFoundError',
      });
    });

    it('does not propagate a throwing reportEvent', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('EBT unavailable');
      });

      expect(() =>
        service.reportKiWrite({
          action: 'create',
          aiIndexId: 'my-index',
          managed: false,
          outcome: 'success',
        })
      ).not.toThrow();
      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
