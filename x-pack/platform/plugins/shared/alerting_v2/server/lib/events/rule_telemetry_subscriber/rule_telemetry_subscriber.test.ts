/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { LoggerService } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createRuleResponse } from '../../test_utils';
import { RULE_CREATED_EVENT } from '../../telemetry/rule_created_event';
import { RULE_CREATED_EVENT_TYPE, type RuleEvent } from '../rule_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { EventBus, Subscription } from '../event_bus';
import { RuleTelemetrySubscriber } from './rule_telemetry_subscriber';

type CapturedHandler = (
  event: AlertingDomainEvent,
  context: AlertingPublisherContext
) => void | Promise<void>;

const rule = createRuleResponse({
  id: 'rule-1',
  enabled: true,
  metadata: { template: { id: 'template-1' } },
});

const createdEvent = (payload: RuleEvent['payload']): RuleEvent => ({
  type: RULE_CREATED_EVENT_TYPE,
  payload,
});

describe('RuleTelemetrySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let analytics: jest.Mocked<Pick<AnalyticsServiceStart, 'reportEvent'>>;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleTelemetrySubscriber;
  let context: AlertingPublisherContext;

  const handler = (): CapturedHandler => {
    const call = bus.subscribe.mock.calls.find(([type]) => type === RULE_CREATED_EVENT_TYPE);
    if (!call) {
      throw new Error(`No handler registered for "${RULE_CREATED_EVENT_TYPE}"`);
    }
    return call[1] as CapturedHandler;
  };

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    analytics = { reportEvent: jest.fn() };
    ({ loggerService, mockLogger } = createLoggerService());
    subscriber = new RuleTelemetrySubscriber(bus, analytics, loggerService);
    context = { request: httpServerMock.createKibanaRequest() as KibanaRequest, origin: 'user' };
  });

  describe('start()', () => {
    it('subscribes a single handler to the rule created event', () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(1);
      expect(bus.subscribe).toHaveBeenCalledWith(RULE_CREATED_EVENT_TYPE, expect.any(Function));
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('event dispatch', () => {
    it('reports the rule created event with the projected rule data', async () => {
      subscriber.start();

      await handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default', rule }), context);

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(RULE_CREATED_EVENT.eventType, {
        rule_id: 'rule-1',
        template_id: 'template-1',
        created_at: rule.created_at,
        kind: 'alert',
        enabled: true,
      });
    });

    it('omits template_id and builder_type for rules without them', async () => {
      subscriber.start();
      const plainRule = createRuleResponse({ id: 'rule-2' });

      await handler()(
        createdEvent({ ruleId: 'rule-2', spaceId: 'default', rule: plainRule }),
        context
      );

      const [, data] = analytics.reportEvent.mock.calls[0];
      expect(data).not.toHaveProperty('template_id');
      expect(data).not.toHaveProperty('builder_type');
    });

    it('skips events without a rule', async () => {
      subscriber.start();

      await handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default' }), context);

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('swallows reportEvent failures and logs them at debug', () => {
      analytics.reportEvent.mockImplementationOnce(() => {
        throw new Error('analytics unavailable');
      });
      subscriber.start();

      expect(() =>
        handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default', rule }), context)
      ).not.toThrow();

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      const [message, meta] = mockLogger.debug.mock.calls[0];
      expect(typeof message === 'function' ? message() : message).toContain(
        'analytics unavailable'
      );
      expect(meta).toEqual({
        labels: expect.objectContaining({ rule_id: 'rule-1', space_id: 'default' }),
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('unsubscribes active subscriptions', () => {
      const unsubscribe = jest.fn();
      bus.subscribe.mockReturnValue({ unsubscribe } satisfies Subscription);

      subscriber.start();
      subscriber.stop();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('allows a subsequent start() to re-subscribe', () => {
      subscriber.start();
      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(2);
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
