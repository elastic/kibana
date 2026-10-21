/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createRuleEventPublisher } from './rule_event_publisher.mock';
import type { EventRule, RuleEventPublisher } from './rule_event_publisher';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  type RuleEventPayload,
} from './events';

describe('RuleEventPublisher', () => {
  let publisher: RuleEventPublisher;
  let eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let context: AlertingPublisherContext;

  beforeEach(() => {
    ({ publisher, eventBus } = createRuleEventPublisher());
    context = { request: httpServerMock.createKibanaRequest(), origin: 'internal' };
  });

  type TestRule = Omit<EventRule, 'origin'>;

  const cases = [
    {
      name: 'emitRuleCreated',
      type: RULE_CREATED_EVENT_TYPE,
      emit: (p: RuleEventPublisher, c: AlertingPublisherContext, rules: EventRule[]) =>
        p.emitRuleCreated(c, rules),
    },
    {
      name: 'emitRuleUpdated',
      type: RULE_UPDATED_EVENT_TYPE,
      emit: (p: RuleEventPublisher, c: AlertingPublisherContext, rules: EventRule[]) =>
        p.emitRuleUpdated(c, rules),
    },
    {
      name: 'emitRuleDeleted',
      type: RULE_DELETED_EVENT_TYPE,
      emit: (p: RuleEventPublisher, c: AlertingPublisherContext, rules: EventRule[]) =>
        p.emitRuleDeleted(c, rules),
    },
    {
      name: 'emitRuleEnabled',
      type: RULE_ENABLED_EVENT_TYPE,
      emit: (p: RuleEventPublisher, c: AlertingPublisherContext, rules: EventRule[]) =>
        p.emitRuleEnabled(c, rules),
    },
    {
      name: 'emitRuleDisabled',
      type: RULE_DISABLED_EVENT_TYPE,
      emit: (p: RuleEventPublisher, c: AlertingPublisherContext, rules: EventRule[]) =>
        p.emitRuleDisabled(c, rules),
    },
  ];

  const withOrigin = (rules: TestRule[]): EventRule[] =>
    rules.map((rule) => ({ ...rule, origin: { channel: 'api' as const } }));

  describe.each(cases)('$name origin', ({ emit }) => {
    it('carries the origin on every event', () => {
      emit(publisher, context, [
        { ruleId: 'rule-1', spaceId: 'space-1', origin: { channel: 'ui', app: 'discover' } },
        { ruleId: 'rule-2', spaceId: 'space-1', origin: { channel: 'ui', app: 'discover' } },
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      for (const [event] of eventBus.publish.mock.calls) {
        expect((event.payload as RuleEventPayload).origin).toEqual({
          channel: 'ui',
          app: 'discover',
        });
      }
    });

    it('omits app when origin has none', () => {
      emit(publisher, context, [
        { ruleId: 'rule-1', spaceId: 'space-1', origin: { channel: 'system' } },
      ]);

      const [[event]] = eventBus.publish.mock.calls;
      const { origin } = event.payload as RuleEventPayload;
      expect(origin).toEqual({ channel: 'system' });
      expect(origin).not.toHaveProperty('app');
    });
  });

  describe.each(cases)('$name', ({ type, emit }) => {
    it('emits the matching event type with a { ruleId, spaceId, origin } envelope and no correlationId for a single rule, forwarding the publisher context as is', () => {
      emit(publisher, context, withOrigin([{ ruleId: 'rule-1', spaceId: 'space-1' }]));

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        {
          type,
          payload: {
            ruleId: 'rule-1',
            spaceId: 'space-1',
            origin: { channel: 'api' },
          },
        },
        context
      );
      const [singleEvent] = eventBus.publish.mock.calls[0];
      expect((singleEvent.payload as RuleEventPayload).correlationId).toBeUndefined();
    });

    it('carries the full domain rule when provided', () => {
      const rule = {
        id: 'rule-1',
        version: 3,
        metadata: { name: 'rule-1' },
      } as EventRule['rule'];
      emit(publisher, context, withOrigin([{ ruleId: 'rule-1', spaceId: 'space-1', rule }]));

      expect(eventBus.publish.mock.calls[0][0].payload).toEqual(
        expect.objectContaining({ ruleId: 'rule-1', spaceId: 'space-1', rule })
      );
    });

    it('emits one event per rule and shares a single correlationId across the batch', () => {
      emit(
        publisher,
        context,
        withOrigin([
          { ruleId: 'rule-1', spaceId: 'space-1' },
          { ruleId: 'rule-2', spaceId: 'space-1' },
        ])
      );

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      const [firstEvent] = eventBus.publish.mock.calls[0];
      const [secondEvent] = eventBus.publish.mock.calls[1];
      const firstPayload = firstEvent.payload as RuleEventPayload;
      const secondPayload = secondEvent.payload as RuleEventPayload;

      expect(firstEvent).toEqual(
        expect.objectContaining({
          type,
          payload: expect.objectContaining({ ruleId: 'rule-1', spaceId: 'space-1' }),
        })
      );
      expect(secondEvent).toEqual(
        expect.objectContaining({
          type,
          payload: expect.objectContaining({ ruleId: 'rule-2', spaceId: 'space-1' }),
        })
      );
      expect(firstPayload.correlationId).toEqual(expect.any(String));
      expect(firstPayload.correlationId).toBe(secondPayload.correlationId);
    });

    it('emits nothing for an empty array', () => {
      emit(publisher, context, []);

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
