/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createActionPolicyEventPublisher } from './action_policy_event_publisher.mock';
import type {
  ActionPolicyEventPublisher,
  EventActionPolicy,
} from './action_policy_event_publisher';
import {
  ACTION_POLICY_CREATED_EVENT_TYPE,
  ACTION_POLICY_DELETED_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EVENT_TYPE,
  type ActionPolicyEventPayload,
} from './events';

type Emit = (
  publisher: ActionPolicyEventPublisher,
  context: AlertingPublisherContext,
  policies: EventActionPolicy[]
) => void;

describe('ActionPolicyEventPublisher', () => {
  let publisher: ActionPolicyEventPublisher;
  let eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let context: AlertingPublisherContext;

  beforeEach(() => {
    ({ publisher, eventBus } = createActionPolicyEventPublisher());
    context = {
      request: httpServerMock.createKibanaRequest(),
      origin: { actor: 'internal', channel: 'api' },
    };
  });

  const cases: Array<{ name: string; type: string; emit: Emit }> = [
    {
      name: 'emitActionPolicyCreated',
      type: ACTION_POLICY_CREATED_EVENT_TYPE,
      emit: (p, c, policies) => p.emitActionPolicyCreated(c, policies),
    },
    {
      name: 'emitActionPolicyUpdated',
      type: ACTION_POLICY_UPDATED_EVENT_TYPE,
      emit: (p, c, policies) => p.emitActionPolicyUpdated(c, policies),
    },
    {
      name: 'emitActionPolicyDeleted',
      type: ACTION_POLICY_DELETED_EVENT_TYPE,
      emit: (p, c, policies) => p.emitActionPolicyDeleted(c, policies),
    },
    {
      name: 'emitActionPolicyEnabled',
      type: ACTION_POLICY_ENABLED_EVENT_TYPE,
      emit: (p, c, policies) => p.emitActionPolicyEnabled(c, policies),
    },
    {
      name: 'emitActionPolicyDisabled',
      type: ACTION_POLICY_DISABLED_EVENT_TYPE,
      emit: (p, c, policies) => p.emitActionPolicyDisabled(c, policies),
    },
  ];

  describe.each(cases)('$name', ({ type, emit }) => {
    it('emits the matching event type with no correlationId for a single policy, forwarding the publisher context as is', () => {
      emit(publisher, context, [{ actionPolicyId: 'policy-1', spaceId: 'space-1' }]);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        { type, payload: { actionPolicyId: 'policy-1', spaceId: 'space-1' } },
        context
      );
    });

    it('carries the full domain policy when provided', () => {
      const policy = { id: 'policy-1', name: 'policy-1' } as ActionPolicyResponse;
      emit(publisher, context, [{ actionPolicyId: 'policy-1', spaceId: 'space-1', policy }]);

      expect(eventBus.publish.mock.calls[0][0].payload).toEqual({
        actionPolicyId: 'policy-1',
        spaceId: 'space-1',
        policy,
      });
    });

    it('emits one event per policy and shares a single correlationId across the batch', () => {
      emit(publisher, context, [
        { actionPolicyId: 'policy-1', spaceId: 'space-1' },
        { actionPolicyId: 'policy-2', spaceId: 'space-1' },
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      const firstPayload = eventBus.publish.mock.calls[0][0].payload as ActionPolicyEventPayload;
      const secondPayload = eventBus.publish.mock.calls[1][0].payload as ActionPolicyEventPayload;

      expect(firstPayload).toEqual(expect.objectContaining({ actionPolicyId: 'policy-1' }));
      expect(secondPayload).toEqual(expect.objectContaining({ actionPolicyId: 'policy-2' }));
      expect(firstPayload.correlationId).toEqual(expect.any(String));
      expect(firstPayload.correlationId).toBe(secondPayload.correlationId);
    });

    it('emits nothing for an empty array', () => {
      emit(publisher, context, []);

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
