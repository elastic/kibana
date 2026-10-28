/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus } from '../event_bus';
import {
  ACTION_POLICY_CREATED_EVENT_TYPE,
  ACTION_POLICY_DELETED_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EVENT_TYPE,
  type ActionPolicyEvent,
  type ActionPolicyEventPayload,
} from './events';

/**
 * Action policy carried in an action policy lifecycle event. `policy` is
 * optional only when the client could not read it around a bulk operation.
 */
export interface EventActionPolicy {
  actionPolicyId: string;
  spaceId: string;
  policy?: ActionPolicyResponse;
}

/**
 * Public contract for the action policy lifecycle event publisher.
 *
 * {@link ActionPolicyClient} calls these methods after a successful write.
 */
export interface ActionPolicyEventPublisherContract {
  emitActionPolicyCreated(context: AlertingPublisherContext, policies: EventActionPolicy[]): void;
  emitActionPolicyUpdated(context: AlertingPublisherContext, policies: EventActionPolicy[]): void;
  emitActionPolicyDeleted(context: AlertingPublisherContext, policies: EventActionPolicy[]): void;
  emitActionPolicyEnabled(context: AlertingPublisherContext, policies: EventActionPolicy[]): void;
  emitActionPolicyDisabled(context: AlertingPublisherContext, policies: EventActionPolicy[]): void;
}

/**
 * Singleton publisher of action policy lifecycle domain events onto the
 * in-process {@link EventBus}.
 *
 * Publishing is fire-and-forget: `publish` returns synchronously and
 * subscriber work runs on the next event-loop iteration.
 */
@injectable()
export class ActionPolicyEventPublisher implements ActionPolicyEventPublisherContract {
  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ) {}

  public emitActionPolicyCreated(
    context: AlertingPublisherContext,
    policies: EventActionPolicy[]
  ): void {
    this.publishForPolicies(context, ACTION_POLICY_CREATED_EVENT_TYPE, policies);
  }

  public emitActionPolicyUpdated(
    context: AlertingPublisherContext,
    policies: EventActionPolicy[]
  ): void {
    this.publishForPolicies(context, ACTION_POLICY_UPDATED_EVENT_TYPE, policies);
  }

  public emitActionPolicyDeleted(
    context: AlertingPublisherContext,
    policies: EventActionPolicy[]
  ): void {
    this.publishForPolicies(context, ACTION_POLICY_DELETED_EVENT_TYPE, policies);
  }

  public emitActionPolicyEnabled(
    context: AlertingPublisherContext,
    policies: EventActionPolicy[]
  ): void {
    this.publishForPolicies(context, ACTION_POLICY_ENABLED_EVENT_TYPE, policies);
  }

  public emitActionPolicyDisabled(
    context: AlertingPublisherContext,
    policies: EventActionPolicy[]
  ): void {
    this.publishForPolicies(context, ACTION_POLICY_DISABLED_EVENT_TYPE, policies);
  }

  private publishForPolicies(
    context: AlertingPublisherContext,
    eventType: ActionPolicyEvent['type'],
    policies: EventActionPolicy[]
  ): void {
    const correlationId = policies.length > 1 ? uuidv4() : undefined;
    for (const policy of policies) {
      this.publish(context, {
        type: eventType,
        payload: this.toEventPayload(policy, correlationId),
      });
    }
  }

  private toEventPayload(
    eventPolicy: EventActionPolicy,
    correlationId?: string
  ): ActionPolicyEventPayload {
    const { actionPolicyId, spaceId, policy } = eventPolicy;
    return {
      actionPolicyId,
      spaceId,
      ...(correlationId ? { correlationId } : {}),
      ...(policy ? { policy } : {}),
    };
  }

  private publish(context: AlertingPublisherContext, event: ActionPolicyEvent): void {
    this.eventBus.publish(event, context);
  }
}
