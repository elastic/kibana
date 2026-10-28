/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { createMockEbtService } from '../../services/ebt_service/ebt_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE } from '../../telemetry/alert_action_ebt_event';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { EventBus, Subscription } from '../event_bus';
import {
  EPISODE_ACKED_EVENT_TYPE,
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_ASSIGNED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
  EPISODE_SNOOZED_EVENT_TYPE,
  EPISODE_TAGGED_EVENT_TYPE,
  EPISODE_UNACKED_EVENT_TYPE,
  EPISODE_UNASSIGNED_EVENT_TYPE,
  EPISODE_UNSNOOZED_EVENT_TYPE,
  type AlertActionEventEnvelope,
  type EpisodeAckedEvent,
} from '../alert_action_event_publisher/events';
import { AlertActionTelemetrySubscriber } from './alert_action_telemetry_subscriber';

type CapturedHandler = (
  event: AlertingDomainEvent,
  context: AlertingPublisherContext
) => void | Promise<void>;

const REPORTED_EVENT_TYPES = [
  EPISODE_ACKED_EVENT_TYPE,
  EPISODE_UNACKED_EVENT_TYPE,
  EPISODE_ASSIGNED_EVENT_TYPE,
  EPISODE_UNASSIGNED_EVENT_TYPE,
  EPISODE_TAGGED_EVENT_TYPE,
  EPISODE_SNOOZED_EVENT_TYPE,
  EPISODE_UNSNOOZED_EVENT_TYPE,
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
] as const;

const envelope = {
  occurredAt: '2025-02-02T12:34:56.000Z',
  groupHash: 'group-hash-1',
  episodeId: 'episode-1',
  ruleId: 'rule-1',
  spaceId: 'default',
  actorUid: 'actor-uid-1',
};

const acked = (overrides: Partial<AlertActionEventEnvelope> = {}): EpisodeAckedEvent => ({
  type: EPISODE_ACKED_EVENT_TYPE,
  ...envelope,
  payload: {},
  ...overrides,
});

/** One turn for the subscriber's grouped flush, which runs on `setImmediate`. */
const flushAsync = async (): Promise<void> => {
  await new Promise((resolve) => setImmediate(resolve));
};

describe('AlertActionTelemetrySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let ebtService: jest.Mocked<EbtServiceContract>;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: AlertActionTelemetrySubscriber;
  let context: AlertingPublisherContext;

  const handler = (type: string = EPISODE_ACKED_EVENT_TYPE): CapturedHandler => {
    const call = bus.subscribe.mock.calls.find(([subscribedType]) => subscribedType === type);
    if (!call) {
      throw new Error(`No handler registered for "${type}"`);
    }
    return call[1] as CapturedHandler;
  };

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    ebtService = createMockEbtService();
    const { loggerService, mockLogger: logger } = createLoggerService();
    mockLogger = logger;
    subscriber = new AlertActionTelemetrySubscriber(bus, ebtService, loggerService);
    context = {
      request: httpServerMock.createKibanaRequest() as KibanaRequest,
      origin: { actor: 'user', channel: 'api' },
    };
  });

  describe('start()', () => {
    it('subscribes a handler to each reported alert action event type', () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(REPORTED_EVENT_TYPES.length);
      for (const type of REPORTED_EVENT_TYPES) {
        expect(bus.subscribe).toHaveBeenCalledWith(type, expect.any(Function));
      }
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(REPORTED_EVENT_TYPES.length);
    });
  });

  describe('event dispatch', () => {
    const apiOrigin = { actor: 'user', channel: 'api' } as const;

    it('reports one event with alert_count 1 for a single action', async () => {
      subscriber.start();

      await handler()(acked(), context);
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        {
          space_id: 'default',
          rule_id: 'rule-1',
          origin: apiOrigin,
          alert_count: 1,
        }
      );
    });

    it('reports one event whose alert_count is the number of actions for one rule', async () => {
      subscriber.start();

      await handler()(acked({ episodeId: 'episode-1' }), context);
      await handler()(acked({ episodeId: 'episode-2' }), context);
      await handler()(acked({ episodeId: 'episode-3' }), context);
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ rule_id: 'rule-1', alert_count: 3 })
      );
    });

    it('reports one event per rule in a batch', async () => {
      subscriber.start();

      await handler()(acked({ ruleId: 'rule-a', episodeId: 'episode-1' }), context);
      await handler()(acked({ ruleId: 'rule-a', episodeId: 'episode-2' }), context);
      await handler()(acked({ ruleId: 'rule-b', episodeId: 'episode-3' }), context);
      await flushAsync();

      expect(ebtService.reportEvent.mock.calls.map((call) => call[1])).toEqual([
        {
          space_id: 'default',
          rule_id: 'rule-a',
          origin: apiOrigin,
          alert_count: 2,
        },
        {
          space_id: 'default',
          rule_id: 'rule-b',
          origin: apiOrigin,
          alert_count: 1,
        },
      ]);
    });

    it('reports assign and clear-assignee as one assign event', async () => {
      subscriber.start();

      await handler(EPISODE_ASSIGNED_EVENT_TYPE)(
        {
          type: EPISODE_ASSIGNED_EVENT_TYPE,
          ...envelope,
          payload: { assigneeUid: 'user-uid-1' },
        },
        context
      );
      await handler(EPISODE_UNASSIGNED_EVENT_TYPE)(
        {
          type: EPISODE_UNASSIGNED_EVENT_TYPE,
          ...envelope,
          episodeId: 'episode-2',
          payload: {},
        },
        context
      );
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.assign,
        {
          space_id: 'default',
          rule_id: 'rule-1',
          origin: apiOrigin,
          alert_count: 2,
        }
      );
    });

    it('omits rule_id when the alert has no rule id', async () => {
      subscriber.start();

      await handler()(acked({ ruleId: null }), context);
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        {
          space_id: 'default',
          origin: apiOrigin,
          alert_count: 1,
        }
      );
    });

    it('forwards the publisher context origin', async () => {
      subscriber.start();

      await handler()(acked(), {
        ...context,
        origin: { actor: 'internal', channel: 'system' },
      });
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ origin: { actor: 'internal', channel: 'system' } })
      );
    });

    it('does not merge events that arrive in different turns', async () => {
      subscriber.start();

      await handler()(acked({ episodeId: 'episode-1' }), context);
      await flushAsync();
      await handler()(acked({ episodeId: 'episode-2' }), context);
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(2);
      expect(ebtService.reportEvent).toHaveBeenNthCalledWith(
        1,
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ alert_count: 1 })
      );
      expect(ebtService.reportEvent).toHaveBeenNthCalledWith(
        2,
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ alert_count: 1 })
      );
    });

    it('keeps events with different origins in separate reports', async () => {
      subscriber.start();

      await handler()(acked({ episodeId: 'episode-1' }), context);
      await handler()(acked({ episodeId: 'episode-2' }), {
        ...context,
        origin: { actor: 'internal', channel: 'system' },
      });
      await flushAsync();

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(2);
      expect(ebtService.reportEvent.mock.calls.map((call) => call[1])).toEqual([
        expect.objectContaining({ origin: apiOrigin, alert_count: 1 }),
        expect.objectContaining({
          origin: { actor: 'internal', channel: 'system' },
          alert_count: 1,
        }),
      ]);
    });

    it('logs a telemetry failure and does not throw', async () => {
      const failure = new Error('telemetry down');
      ebtService.reportEvent.mockImplementation(() => {
        throw failure;
      });
      subscriber.start();

      await handler()(acked(), context);
      await flushAsync();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to report alert action telemetry',
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.TELEMETRY_EBT_REPORT_FAILED,
          }),
          error: expect.objectContaining({
            stack_trace: expect.stringContaining('telemetry down'),
          }),
        })
      );
    });
  });

  describe('stop()', () => {
    it('unsubscribes active subscriptions', () => {
      const unsubscribe = jest.fn();
      bus.subscribe.mockReturnValue({ unsubscribe } satisfies Subscription);

      subscriber.start();
      subscriber.stop();

      expect(unsubscribe).toHaveBeenCalledTimes(REPORTED_EVENT_TYPES.length);
    });

    it('allows a subsequent start() to re-subscribe', () => {
      subscriber.start();
      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(REPORTED_EVENT_TYPES.length * 2);
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });

    it('drops a buffered batch that has not been reported yet', async () => {
      subscriber.start();
      await handler()(acked(), context);
      subscriber.stop();
      await flushAsync();

      expect(ebtService.reportEvent).not.toHaveBeenCalled();
    });
  });
});
