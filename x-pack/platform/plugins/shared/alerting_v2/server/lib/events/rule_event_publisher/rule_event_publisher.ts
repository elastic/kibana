/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { RuleLifecycleEvent } from '../../../../common/workflows/triggers';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus } from '../event_bus';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  type RuleEvent,
} from './events';

/**
 * Public contract for the rule-lifecycle event publisher.
 *
 * Persistence callers ({@link RulesClient}) use these methods after successful
 * CRUD. The publisher dispatches domain events onto the in-process bus;
 * {@link RuleWorkflowSubscriber} maps them to workflow triggers.
 */
export interface RuleEventPublisherContract {
  emitRuleCreated(request: KibanaRequest, ruleIds: string[], spaceId: string): void;
  emitRuleUpdated(request: KibanaRequest, ruleIds: string[], spaceId: string): void;
  emitRuleDeleted(request: KibanaRequest, ruleIds: string[], spaceId: string): void;
  emitRuleEnabled(request: KibanaRequest, ruleIds: string[], spaceId: string): void;
  emitRuleDisabled(request: KibanaRequest, ruleIds: string[], spaceId: string): void;
}

/**
 * Singleton publisher of rule-lifecycle domain events onto the in-process
 * {@link EventBus}.
 *
 * Publishing is fire-and-forget — `publish` returns synchronously and
 * subscriber work runs on the next event-loop iteration.
 */
@injectable()
export class RuleEventPublisher implements RuleEventPublisherContract {
  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ) {}

  public emitRuleCreated(request: KibanaRequest, ruleIds: string[], spaceId: string): void {
    this.publishForRules(request, RULE_CREATED_EVENT_TYPE, ruleIds, spaceId);
  }

  public emitRuleUpdated(request: KibanaRequest, ruleIds: string[], spaceId: string): void {
    this.publishForRules(request, RULE_UPDATED_EVENT_TYPE, ruleIds, spaceId);
  }

  public emitRuleDeleted(request: KibanaRequest, ruleIds: string[], spaceId: string): void {
    this.publishForRules(request, RULE_DELETED_EVENT_TYPE, ruleIds, spaceId);
  }

  public emitRuleEnabled(request: KibanaRequest, ruleIds: string[], spaceId: string): void {
    this.publishForRules(request, RULE_ENABLED_EVENT_TYPE, ruleIds, spaceId);
  }

  public emitRuleDisabled(request: KibanaRequest, ruleIds: string[], spaceId: string): void {
    this.publishForRules(request, RULE_DISABLED_EVENT_TYPE, ruleIds, spaceId);
  }

  private publishForRules(
    request: KibanaRequest,
    eventType: RuleEvent['type'],
    ruleIds: string[],
    spaceId: string
  ): void {
    for (const ruleId of ruleIds) {
      this.publish(request, {
        type: eventType,
        payload: this.toLifecyclePayload(ruleId, spaceId),
      });
    }
  }

  private toLifecyclePayload(ruleId: string, spaceId: string): RuleLifecycleEvent {
    return {
      rule: {
        ruleId,
        spaceId,
      },
    };
  }

  private publish(request: KibanaRequest, event: RuleEvent): void {
    this.eventBus.publish(event, { request });
  }
}
