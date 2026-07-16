/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { UserProfileWithSecurity } from '@kbn/core-user-profile-common';
import type { LoggerService } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { RuleChangeHistoryAction } from '../../rule_change_history';
import { createRuleChangeHistoryServiceMock } from '../../rule_change_history/rule_change_history_service.mock';
import { createRuleResponse } from '../../test_utils';
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
  context: AlertingPublisherContext
) => void | Promise<void>;

const author = { uid: 'profile-uid', username: 'elastic' } as const;
const profile = {
  uid: author.uid,
  user: { username: author.username },
} as UserProfileWithSecurity;

const rule = createRuleResponse({ id: 'rule-1', revision: 3 });

const payload: RuleEvent['payload'] = {
  ruleId: 'rule-1',
  spaceId: 'my-space',
  rule,
  correlationId: 'corr-1',
};

const eventOf = (type: RuleEvent['type'], override = payload): RuleEvent =>
  ({ type, payload: override } as RuleEvent);

describe('RuleChangeHistorySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let changeHistory: ReturnType<typeof createRuleChangeHistoryServiceMock>;
  let userProfile: jest.Mocked<UserProfileServiceStart>;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleChangeHistorySubscriber;
  let request: KibanaRequest;

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    changeHistory = createRuleChangeHistoryServiceMock();
    userProfile = userProfileServiceMock.createStart();
    userProfile.getCurrent.mockResolvedValue(profile);
    ({ loggerService, mockLogger } = createLoggerService());
    subscriber = new RuleChangeHistorySubscriber(bus, changeHistory, userProfile, loggerService);
    request = httpServerMock.createKibanaRequest();
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
      'logs $eventType as action "$action" / event.type "$ecsEventType", using the rule as the snapshot',
      async ({ eventType, action, ecsEventType }) => {
        subscriber.start();

        await handlerFor(eventType)(eventOf(eventType), { request });

        expect(userProfile.getCurrent).toHaveBeenCalledWith({ request });
        expect(changeHistory.logRuleChanges).toHaveBeenCalledTimes(1);
        expect(changeHistory.logRuleChanges).toHaveBeenCalledWith({
          spaceId: 'my-space',
          author,
          entries: [{ id: 'rule-1', snapshot: rule, sequence: 3 }],
          action,
          eventType: ecsEventType,
          correlationId: 'corr-1',
        });
      }
    );

    it('resolves null author fields when there is no current profile', async () => {
      userProfile.getCurrent.mockResolvedValue(null);
      subscriber.start();

      await handlerFor(RULE_CREATED_EVENT_TYPE)(eventOf(RULE_CREATED_EVENT_TYPE), { request });

      expect(changeHistory.logRuleChanges).toHaveBeenCalledWith(
        expect.objectContaining({ author: { uid: null, username: null } })
      );
    });

    it('skips events without a rule (bare rule reference, e.g. bulk-delete fallback)', async () => {
      subscriber.start();

      await handlerFor(RULE_DELETED_EVENT_TYPE)(
        eventOf(RULE_DELETED_EVENT_TYPE, {
          ruleId: 'rule-1',
          spaceId: 'my-space',
          correlationId: 'corr-1',
        }),
        { request }
      );

      expect(changeHistory.logRuleChanges).not.toHaveBeenCalled();
    });

    it('skips events whose rule has no revision', async () => {
      subscriber.start();
      const ruleWithoutSequence = createRuleResponse({
        id: 'rule-1',
        revision: undefined,
      });

      await handlerFor(RULE_UPDATED_EVENT_TYPE)(
        eventOf(RULE_UPDATED_EVENT_TYPE, { ...payload, rule: ruleWithoutSequence }),
        { request }
      );

      expect(changeHistory.logRuleChanges).not.toHaveBeenCalled();
    });

    it('catches logRuleChanges failures, logs them, and does not let the rejection escape', async () => {
      changeHistory.logRuleChanges.mockRejectedValueOnce(new Error('es unreachable'));
      subscriber.start();

      await expect(
        handlerFor(RULE_CREATED_EVENT_TYPE)(eventOf(RULE_CREATED_EVENT_TYPE), { request })
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
