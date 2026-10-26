/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_CREATED_EBT_EVENT_TYPE,
  RULE_DELETED_EBT_EVENT_TYPE,
} from '../../telemetry/rule_ebt_schema';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { createMockEbtService } from '../../services/ebt_service/ebt_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createRuleResponse } from '../../test_utils';
import { RULE_EBT_EVENT_TYPE_BY_OPERATION, RULE_OPERATIONS } from '../../telemetry/rule_ebt_event';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  type RuleEvent,
  type RuleEventPayload,
} from '../rule_event_publisher/events';
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
});

const eventOfType = (type: RuleEvent['type'], payload: RuleEventPayload): RuleEvent => ({
  type,
  payload,
});

const createdEvent = (...args: [Parameters<typeof eventOfType>[1]]): RuleEvent =>
  eventOfType(RULE_CREATED_EVENT_TYPE, ...args);

describe('RuleTelemetrySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let ebtService: jest.Mocked<EbtServiceContract>;
  let subscriber: RuleTelemetrySubscriber;
  let context: AlertingPublisherContext;

  const handler = (type: string = RULE_CREATED_EVENT_TYPE): CapturedHandler => {
    const call = bus.subscribe.mock.calls.find(([subscribedType]) => subscribedType === type);
    if (!call) {
      throw new Error(`No handler registered for "${type}"`);
    }
    return call[1] as CapturedHandler;
  };

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    ebtService = createMockEbtService();
    const { loggerService } = createLoggerService();
    subscriber = new RuleTelemetrySubscriber(bus, ebtService, loggerService);
    context = {
      request: httpServerMock.createKibanaRequest() as KibanaRequest,
      origin: { actor: 'user', channel: 'api' },
    };
  });

  describe('start()', () => {
    it('subscribes a handler to each reported rule event type', () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(RULE_OPERATIONS.length);
      for (const type of [
        RULE_CREATED_EVENT_TYPE,
        RULE_UPDATED_EVENT_TYPE,
        RULE_DELETED_EVENT_TYPE,
        RULE_ENABLED_EVENT_TYPE,
        RULE_DISABLED_EVENT_TYPE,
      ]) {
        expect(bus.subscribe).toHaveBeenCalledWith(type, expect.any(Function));
      }
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(RULE_OPERATIONS.length);
    });
  });

  describe('event dispatch', () => {
    it.each(RULE_OPERATIONS)(
      'reports %s as its event type with the projected rule data',
      async (type) => {
        subscriber.start();

        await handler(type)(
          eventOfType(type, {
            ruleId: 'rule-1',
            spaceId: 'default',
            rule,
            templateId: 'template-1',
          }),
          context
        );

        expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
        expect(ebtService.reportEvent).toHaveBeenCalledWith(
          RULE_EBT_EVENT_TYPE_BY_OPERATION[type],
          {
            rule_id: 'rule-1',
            template_id: 'template-1',
            created_at: rule.created_at,
            kind: 'alert',
            enabled: true,
            origin: { actor: 'user', channel: 'api' },
          }
        );
      }
    );

    it('reports the publisher context origin as origin.actor', async () => {
      subscriber.start();

      await handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default', rule }), {
        ...context,
        origin: { actor: 'internal', channel: 'api' },
      });

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        RULE_CREATED_EBT_EVENT_TYPE,
        expect.objectContaining({
          rule_id: 'rule-1',
          origin: expect.objectContaining({ actor: 'internal' }),
        })
      );
    });

    it('forwards the channel and app from the publisher context', async () => {
      subscriber.start();

      await handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default', rule }), {
        ...context,
        origin: { actor: 'user', channel: 'ui', app: 'discover' },
      });

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        RULE_CREATED_EBT_EVENT_TYPE,
        expect.objectContaining({
          rule_id: 'rule-1',
          origin: { actor: 'user', channel: 'ui', app: 'discover' },
        })
      );
    });

    it('omits origin.app when the publisher context has none', async () => {
      subscriber.start();

      await handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default', rule }), context);

      const [, data] = ebtService.reportEvent.mock.calls[0];
      expect(data.origin).not.toHaveProperty('app');
    });

    it('omits template_id and builder_type for rules without them', async () => {
      subscriber.start();
      const plainRule = createRuleResponse({ id: 'rule-2' });

      await handler()(
        createdEvent({ ruleId: 'rule-2', spaceId: 'default', rule: plainRule }),
        context
      );

      const [, data] = ebtService.reportEvent.mock.calls[0];
      expect(data).not.toHaveProperty('template_id');
      expect(data).not.toHaveProperty('builder_type');
    });

    it('skips reporting when the operation has no EBT event type', async () => {
      subscriber.start();

      await handler()(
        eventOfType('rule.unmapped' as RuleEvent['type'], {
          ruleId: 'rule-1',
          spaceId: 'default',
          rule,
        }),
        context
      );

      expect(ebtService.reportEvent).not.toHaveBeenCalled();
    });

    it('reports rule_id and origin when the domain rule is missing', async () => {
      subscriber.start();

      await handler()(createdEvent({ ruleId: 'rule-1', spaceId: 'default' }), context);
      await handler(RULE_DELETED_EVENT_TYPE)(
        eventOfType(RULE_DELETED_EVENT_TYPE, {
          ruleId: 'rule-1',
          spaceId: 'default',
        }),
        { ...context, origin: { actor: 'user', channel: 'system', app: 'nightshift' } }
      );

      expect(ebtService.reportEvent).toHaveBeenNthCalledWith(1, RULE_CREATED_EBT_EVENT_TYPE, {
        rule_id: 'rule-1',
        origin: { actor: 'user', channel: 'api' },
      });
      expect(ebtService.reportEvent).toHaveBeenNthCalledWith(2, RULE_DELETED_EBT_EVENT_TYPE, {
        rule_id: 'rule-1',
        origin: { actor: 'user', channel: 'system', app: 'nightshift' },
      });
    });
  });

  describe('stop()', () => {
    it('unsubscribes active subscriptions', () => {
      const unsubscribe = jest.fn();
      bus.subscribe.mockReturnValue({ unsubscribe } satisfies Subscription);

      subscriber.start();
      subscriber.stop();

      expect(unsubscribe).toHaveBeenCalledTimes(RULE_OPERATIONS.length);
    });

    it('allows a subsequent start() to re-subscribe', () => {
      subscriber.start();
      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(RULE_OPERATIONS.length * 2);
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
