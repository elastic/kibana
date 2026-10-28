/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { createMockEbtService } from '../../services/ebt_service/ebt_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION,
  ACTION_POLICY_OPERATIONS,
  buildActionPolicyChangedEventData,
} from '../../telemetry/action_policy_ebt_event';
import { ACTION_POLICY_CREATED_EBT_EVENT_TYPE } from '../../telemetry/action_policy_ebt_schema';
import {
  ACTION_POLICY_CREATED_EVENT_TYPE,
  type ActionPolicyEvent,
  type ActionPolicyEventPayload,
} from '../action_policy_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { EventBus, Subscription } from '../event_bus';
import { ActionPolicyTelemetrySubscriber } from './action_policy_telemetry_subscriber';

type CapturedHandler = (
  event: AlertingDomainEvent,
  context: AlertingPublisherContext
) => void | Promise<void>;

const policy: ActionPolicyResponse = {
  id: 'policy-1',
  name: 'policy-1',
  description: 'description',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  created_by: { profile_uid: 'creator' },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_by: { profile_uid: 'updater' },
  updated_at: '2025-01-02T00:00:00.000Z',
};

const eventOfType = (
  type: ActionPolicyEvent['type'],
  payload: ActionPolicyEventPayload
): ActionPolicyEvent => ({ type, payload });

describe('ActionPolicyTelemetrySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let ebtService: jest.Mocked<EbtServiceContract>;
  let subscriber: ActionPolicyTelemetrySubscriber;
  let context: AlertingPublisherContext;

  const handler = (type: string = ACTION_POLICY_CREATED_EVENT_TYPE): CapturedHandler => {
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
    subscriber = new ActionPolicyTelemetrySubscriber(bus, ebtService, loggerService);
    context = {
      request: httpServerMock.createKibanaRequest() as KibanaRequest,
      origin: { actor: 'user', channel: 'api' },
    };
  });

  describe('start()', () => {
    it('subscribes a handler to each reported action policy event type', () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(ACTION_POLICY_OPERATIONS.length);
      for (const type of ACTION_POLICY_OPERATIONS) {
        expect(bus.subscribe).toHaveBeenCalledWith(type, expect.any(Function));
      }
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(ACTION_POLICY_OPERATIONS.length);
    });
  });

  describe('event dispatch', () => {
    it.each(ACTION_POLICY_OPERATIONS)(
      'reports %s as its event type with the projected policy data',
      async (type) => {
        subscriber.start();

        await handler(type)(
          eventOfType(type, { actionPolicyId: 'policy-1', spaceId: 'space-1', policy }),
          context
        );

        expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
        expect(ebtService.reportEvent).toHaveBeenCalledWith(
          ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[type],
          buildActionPolicyChangedEventData(policy, context.origin, 'policy-1', 'space-1')
        );
      }
    );

    it('reports the origin from the publisher context', async () => {
      subscriber.start();

      await handler()(
        eventOfType(ACTION_POLICY_CREATED_EVENT_TYPE, {
          actionPolicyId: 'policy-1',
          spaceId: 'space-1',
          policy,
        }),
        { ...context, origin: { actor: 'internal', channel: 'ui', app: 'discover' } }
      );

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
        expect.objectContaining({
          action_policy_id: 'policy-1',
          space_id: 'space-1',
          origin: { actor: 'internal', channel: 'ui', app: 'discover' },
        })
      );
    });

    it.each(ACTION_POLICY_OPERATIONS)(
      'reports %s with only the id, space and origin when the domain policy is missing',
      async (type) => {
        subscriber.start();

        await handler(type)(
          eventOfType(type, { actionPolicyId: 'policy-1', spaceId: 'space-1' }),
          context
        );

        expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
        expect(ebtService.reportEvent).toHaveBeenCalledWith(
          ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[type],
          {
            action_policy_id: 'policy-1',
            space_id: 'space-1',
            origin: { actor: 'user', channel: 'api' },
          }
        );
      }
    );
  });

  describe('stop()', () => {
    it('unsubscribes active subscriptions', () => {
      const unsubscribe = jest.fn();
      bus.subscribe.mockReturnValue({ unsubscribe } satisfies Subscription);

      subscriber.start();
      subscriber.stop();

      expect(unsubscribe).toHaveBeenCalledTimes(ACTION_POLICY_OPERATIONS.length);
    });

    it('allows a subsequent start() to re-subscribe', () => {
      subscriber.start();
      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(ACTION_POLICY_OPERATIONS.length * 2);
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
