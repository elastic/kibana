/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRuleData } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { buildRuleSnapshot } from '../../../../common/workflows/triggers';
import type { RuleLifecycleEvent } from '../../../../common/workflows/triggers';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
import type { RuleResponse } from '../../rules_client/types';
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
  type RuleCreatedEvent,
  type RuleDeletedEvent,
  type RuleDisabledEvent,
  type RuleEnabledEvent,
  type RuleUpdatedEvent,
} from './events';

/**
 * Public contract for the rule-lifecycle event publisher.
 *
 * Persistence callers ({@link RulesClient}) use these methods after successful
 * CRUD. The publisher dispatches domain events onto the in-process bus;
 * {@link RuleWorkflowSubscriber} maps them to workflow triggers.
 */
export interface RuleEventPublisherContract {
  emitRuleCreated(request: KibanaRequest, rule: RuleResponse, spaceId: string): void;
  emitRuleUpdated(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void;
  emitRuleDeleted(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void;
  emitRuleEnabled(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void;
  emitRuleDisabled(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void;
  emitAfterRuleUpdate(
    request: KibanaRequest,
    parsed: UpdateRuleData,
    existingAttrs: RuleSavedObjectAttributes,
    rule: RuleResponse,
    spaceId: string
  ): void;
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

  public emitRuleCreated(request: KibanaRequest, rule: RuleResponse, spaceId: string): void {
    this.publishForRules(request, RULE_CREATED_EVENT_TYPE, [rule], spaceId);
  }

  public emitRuleUpdated(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void {
    this.publishForRules(request, RULE_UPDATED_EVENT_TYPE, rules, spaceId);
  }

  public emitRuleDeleted(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void {
    this.publishForRules(request, RULE_DELETED_EVENT_TYPE, rules, spaceId);
  }

  public emitRuleEnabled(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void {
    this.publishForRules(request, RULE_ENABLED_EVENT_TYPE, rules, spaceId);
  }

  public emitRuleDisabled(request: KibanaRequest, rules: RuleResponse[], spaceId: string): void {
    this.publishForRules(request, RULE_DISABLED_EVENT_TYPE, rules, spaceId);
  }

  public emitAfterRuleUpdate(
    request: KibanaRequest,
    parsed: UpdateRuleData,
    existingAttrs: RuleSavedObjectAttributes,
    rule: RuleResponse,
    spaceId: string
  ): void {
    if (Object.keys(parsed).length === 0) {
      return;
    }

    const payload = this.toLifecyclePayload([rule], spaceId);

    this.publish(request, { type: RULE_UPDATED_EVENT_TYPE, payload });

    if (parsed.enabled !== undefined && parsed.enabled !== existingAttrs.enabled) {
      this.publish(request, {
        type: rule.enabled ? RULE_ENABLED_EVENT_TYPE : RULE_DISABLED_EVENT_TYPE,
        payload,
      });
    }
  }

  private publishForRules(
    request: KibanaRequest,
    eventType:
      | typeof RULE_CREATED_EVENT_TYPE
      | typeof RULE_UPDATED_EVENT_TYPE
      | typeof RULE_DELETED_EVENT_TYPE
      | typeof RULE_ENABLED_EVENT_TYPE
      | typeof RULE_DISABLED_EVENT_TYPE,
    rules: RuleResponse[],
    spaceId: string
  ): void {
    if (rules.length === 0) {
      return;
    }

    const payload = this.toLifecyclePayload(rules, spaceId);
    this.publish(request, { type: eventType, payload });
  }

  private toLifecyclePayload(rules: RuleResponse[], spaceId: string): RuleLifecycleEvent {
    return {
      rules: rules.map((rule) => buildRuleSnapshot(rule, spaceId)),
    };
  }

  private publish(
    request: KibanaRequest,
    event:
      | RuleCreatedEvent
      | RuleUpdatedEvent
      | RuleDeletedEvent
      | RuleEnabledEvent
      | RuleDisabledEvent
  ): void {
    this.eventBus.publish(event, { request });
  }
}
