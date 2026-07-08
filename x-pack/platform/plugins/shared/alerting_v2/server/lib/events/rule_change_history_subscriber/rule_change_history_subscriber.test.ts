/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LoggerService } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { RuleChangeHistoryAction, type RuleSnapshot } from '../../rule_change_history';
import { createRuleChangeHistoryServiceMock } from '../../rule_change_history/rule_change_history_service.mock';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  type RuleEvent,
} from '../rule_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { EventBus, Subscription } from '../event_bus';
import { RuleChangeHistorySubscriber } from './rule_change_history_subscriber';
import { RULE_CHANGE_HISTORY_MAPPINGS } from './mappings';

type CapturedHandler = (
  event: AlertingDomainEvent,
  context?: AlertingPublisherContext
) => void | Promise<void>;

const author = { uid: 'profile-uid', username: 'elastic' } as const;
const snapshot: RuleSnapshot = { attributes: { metadata: { name: 'rule-1' } }, references: [] };

const enrichedPayload: RuleEvent['payload'] = {
  rule: { ruleId: 'rule-1', spaceId: 'my-space' },
  snapshot,
  sequence: 3,
  author,
};

const eventOf = (type: RuleEvent['type'], payload = enrichedPayload): RuleEvent =>
  ({ type, payload } as RuleEvent);

describe('RuleChangeHistorySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let changeHistory: ReturnType<typeof createRuleChangeHistoryServiceMock>;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleChangeHistorySubscriber;

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    changeHistory = createRuleChangeHistoryServiceMock();
    ({ loggerService, mockLogger } = createLoggerService());
    subscriber = new RuleChangeHistorySubscriber(bus, changeHistory, loggerService);
  });

  describe('start()', () => {
    it('subscribes one handler per mapping, using each mapping event type', () => {
      subscriber.start();

      const mappingEventTypes = Object.keys(RULE_CHANGE_HISTORY_MAPPINGS);
      expect(bus.subscribe).toHaveBeenCalledTimes(mappingEventTypes.length);

      const subscribedEventTypes = bus.subscribe.mock.calls.map(([eventType]) => eventType);
      expect(subscribedEventTypes.sort()).toEqual(mappingEventTypes.sort());
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      const firstCallCount = bus.subscribe.mock.calls.length;
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe('event dispatch', () => {
    const handlerFor = (eventType: AlertingDomainEvent['type']): CapturedHandler => {
      const call = bus.subscribe.mock.calls.find(([type]) => type === eventType);
      if (!call) {
        throw new Error(`No handler registered for "${eventType}"`);
      }
      return call[1] as CapturedHandler;
    };

    it.each`
      eventType                   | action                                 | ecsEventType
      ${RULE_CREATED_EVENT_TYPE}  | ${RuleChangeHistoryAction.ruleCreate}  | ${'creation'}
      ${RULE_UPDATED_EVENT_TYPE}  | ${RuleChangeHistoryAction.ruleUpdate}  | ${'change'}
      ${RULE_ENABLED_EVENT_TYPE}  | ${RuleChangeHistoryAction.ruleEnable}  | ${'change'}
      ${RULE_DISABLED_EVENT_TYPE} | ${RuleChangeHistoryAction.ruleDisable} | ${'change'}
      ${RULE_DELETED_EVENT_TYPE}  | ${RuleChangeHistoryAction.ruleDelete}  | ${'deletion'}
    `(
      'logs $eventType as action "$action" / event.type "$ecsEventType"',
      async ({ eventType, action, ecsEventType }) => {
        subscriber.start();

        await handlerFor(eventType)(eventOf(eventType));

        expect(changeHistory.logRuleChanges).toHaveBeenCalledTimes(1);
        expect(changeHistory.logRuleChanges).toHaveBeenCalledWith({
          spaceId: 'my-space',
          author,
          entries: [{ id: 'rule-1', snapshot, sequence: 3 }],
          action,
          eventType: ecsEventType,
        });
      }
    );

    it('forwards the correlationId when the event carries one (bulk operations)', async () => {
      subscriber.start();

      await handlerFor(RULE_ENABLED_EVENT_TYPE)(
        eventOf(RULE_ENABLED_EVENT_TYPE, { ...enrichedPayload, correlationId: 'bulk-1' })
      );

      expect(changeHistory.logRuleChanges).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'bulk-1' })
      );
    });

    it('skips events without a snapshot (bare rule reference)', async () => {
      subscriber.start();

      await handlerFor(RULE_DELETED_EVENT_TYPE)(
        eventOf(RULE_DELETED_EVENT_TYPE, { rule: { ruleId: 'rule-1', spaceId: 'my-space' } })
      );

      expect(changeHistory.logRuleChanges).not.toHaveBeenCalled();
    });

    it('skips events without a sequence', async () => {
      subscriber.start();
      const { sequence, ...withoutSequence } = enrichedPayload;

      await handlerFor(RULE_UPDATED_EVENT_TYPE)(eventOf(RULE_UPDATED_EVENT_TYPE, withoutSequence));

      expect(changeHistory.logRuleChanges).not.toHaveBeenCalled();
    });

    it('skips events without an author', async () => {
      subscriber.start();
      const { author: _author, ...withoutAuthor } = enrichedPayload;

      await handlerFor(RULE_UPDATED_EVENT_TYPE)(eventOf(RULE_UPDATED_EVENT_TYPE, withoutAuthor));

      expect(changeHistory.logRuleChanges).not.toHaveBeenCalled();
    });

    it('catches logRuleChanges failures, logs them, and does not let the rejection escape', async () => {
      changeHistory.logRuleChanges.mockRejectedValueOnce(new Error('es unreachable'));
      subscriber.start();

      await expect(
        handlerFor(RULE_CREATED_EVENT_TYPE)(eventOf(RULE_CREATED_EVENT_TYPE))
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop()', () => {
    it('unsubscribes every active subscription and clears internal state', () => {
      const unsubscribers: jest.Mock[] = [];
      bus.subscribe.mockImplementation(() => {
        const unsubscribe = jest.fn();
        unsubscribers.push(unsubscribe);
        return { unsubscribe } satisfies Subscription;
      });

      subscriber.start();
      expect(unsubscribers.length).toBe(Object.keys(RULE_CHANGE_HISTORY_MAPPINGS).length);

      subscriber.stop();

      for (const unsubscribe of unsubscribers) {
        expect(unsubscribe).toHaveBeenCalledTimes(1);
      }
    });

    it('makes a subsequent start() re-subscribe (state cleared)', () => {
      subscriber.start();
      const firstCount = bus.subscribe.mock.calls.length;

      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(firstCount * 2);
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
