/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ContextEngineAnalyticsService } from './analytics_service';
import { CONTEXT_ENGINE_EVENT_TYPES, contextEngineServerEbtEvents } from './events';

const CLUSTER_UUID = 'cluster-uuid-1';

const hashed = (aiIndexId: string) =>
  createHash('sha256')
    .update(aiIndexId + CLUSTER_UUID)
    .digest('hex');

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('ContextEngineAnalyticsService', () => {
  let analytics: { registerEventType: jest.Mock; reportEvent: jest.Mock };
  let logger: { debug: jest.Mock };
  let service: ContextEngineAnalyticsService;

  beforeEach(async () => {
    analytics = { registerEventType: jest.fn(), reportEvent: jest.fn() };
    logger = { debug: jest.fn() };
    service = new ContextEngineAnalyticsService(
      analytics as unknown as AnalyticsServiceSetup,
      logger as unknown as Logger
    );
    service.setClusterUuidFetcher(async () => CLUSTER_UUID);
    await flushPromises();
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
        ai_index_id: hashed('my-index'),
        managed: false,
        outcome: 'success',
      });
    });

    it('hashes a user-owned id with the cluster uuid as salt', () => {
      service.reportKiWrite({
        action: 'create',
        aiIndexId: 'my-index',
        managed: false,
        outcome: 'success',
      });

      const [, payload] = analytics.reportEvent.mock.calls[0];
      expect(payload.ai_index_id).toBe(hashed('my-index'));
      expect(payload.ai_index_id).not.toContain('my-index');
    });

    it('reports a managed id verbatim', () => {
      service.reportKiWrite({
        action: 'create',
        aiIndexId: 'managed-index',
        managed: true,
        outcome: 'success',
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(CONTEXT_ENGINE_EVENT_TYPES.KiCreate, {
        ai_index_id: 'managed-index',
        managed: true,
        outcome: 'success',
      });
    });

    it('hashes the id when the managed state is unknown', () => {
      service.reportKiWrite({ action: 'create', aiIndexId: 'my-index', outcome: 'failure' });

      const [, payload] = analytics.reportEvent.mock.calls[0];
      expect(payload.ai_index_id).toBe(hashed('my-index'));
      expect(payload).not.toHaveProperty('managed');
    });

    it('reports "unknown" when the cluster uuid is not available', () => {
      const saltless = new ContextEngineAnalyticsService(
        analytics as unknown as AnalyticsServiceSetup,
        logger as unknown as Logger
      );

      saltless.reportKiWrite({
        action: 'create',
        aiIndexId: 'my-index',
        managed: false,
        outcome: 'success',
      });

      const [, payload] = analytics.reportEvent.mock.calls[0];
      expect(payload.ai_index_id).toBe('unknown');
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
        ai_index_id: hashed('my-index'),
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

  describe('cluster uuid fetch', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('retries with a delay after a failed fetch', async () => {
      jest.useFakeTimers();
      const fetcher = jest
        .fn()
        .mockRejectedValueOnce(new Error('ES unavailable'))
        .mockResolvedValue(CLUSTER_UUID);
      const recovering = new ContextEngineAnalyticsService(
        analytics as unknown as AnalyticsServiceSetup,
        logger as unknown as Logger
      );
      recovering.setClusterUuidFetcher(fetcher);
      await jest.advanceTimersByTimeAsync(0);

      recovering.reportKiWrite({ action: 'create', aiIndexId: 'my-index', outcome: 'success' });
      expect(analytics.reportEvent.mock.calls[0][1].ai_index_id).toBe('unknown');
      expect(fetcher).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);
      recovering.reportKiWrite({ action: 'create', aiIndexId: 'my-index', outcome: 'success' });
      expect(analytics.reportEvent.mock.calls[1][1].ai_index_id).toBe(hashed('my-index'));
      expect(fetcher).toHaveBeenCalledTimes(2);

      recovering.stop();
    });

    it('does not fetch again on reported events', () => {
      const fetcher = jest.fn().mockReturnValue(new Promise<string>(() => {}));
      const pending = new ContextEngineAnalyticsService(
        analytics as unknown as AnalyticsServiceSetup,
        logger as unknown as Logger
      );
      pending.setClusterUuidFetcher(fetcher);

      pending.reportKiWrite({ action: 'create', aiIndexId: 'my-index', outcome: 'success' });
      pending.reportKiWrite({ action: 'update', aiIndexId: 'my-index', outcome: 'success' });

      expect(fetcher).toHaveBeenCalledTimes(1);
      pending.stop();
    });

    it('stops retrying once stopped', async () => {
      jest.useFakeTimers();
      const fetcher = jest.fn().mockRejectedValue(new Error('ES unavailable'));
      const stopped = new ContextEngineAnalyticsService(
        analytics as unknown as AnalyticsServiceSetup,
        logger as unknown as Logger
      );
      stopped.setClusterUuidFetcher(fetcher);
      await jest.advanceTimersByTimeAsync(0);
      expect(fetcher).toHaveBeenCalledTimes(1);

      stopped.stop();
      await jest.advanceTimersByTimeAsync(5000);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('aiIndexIdForTelemetry', () => {
    it('hashes a user-owned id with the cluster uuid as salt', () => {
      expect(service.aiIndexIdForTelemetry('my-index')).toBe(hashed('my-index'));
      expect(service.aiIndexIdForTelemetry('my-index', false)).toBe(hashed('my-index'));
    });

    it('returns a managed id verbatim', () => {
      expect(service.aiIndexIdForTelemetry('managed-index', true)).toBe('managed-index');
    });

    it('returns "unknown" when the cluster uuid is not available', () => {
      const saltless = new ContextEngineAnalyticsService(
        analytics as unknown as AnalyticsServiceSetup,
        logger as unknown as Logger
      );
      expect(saltless.aiIndexIdForTelemetry('my-index')).toBe('unknown');
    });
  });
});
