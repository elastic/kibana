/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERTING_V2_LOG_CODES } from '../../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { WorkflowServiceToken } from '../../services/workflow_service/tokens';
import type { WorkflowServiceContract } from '../../services/workflow_service/workflow_service';
import type { RuleExecutorEvent } from '../rule_executor_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import {
  RULE_EXECUTOR_WORKFLOW_TRIGGERS,
  type RuleExecutorWorkflowTriggerBinding,
} from './triggers';

/**
 * Singleton bus subscriber that routes rule-executor domain events
 * (`rule.execution.succeeded`, `rule.execution.failed`) to the
 * workflows-extensions emit path via {@link WorkflowServiceContract}.
 *
 * Unlike the rule-lifecycle subscriber, a binding may return `null` from
 * `toPayload` to skip emission for a given event (e.g. a successful run that
 * produced no rule events). The subscriber honours that gate.
 */
@injectable()
export class RuleExecutorWorkflowSubscriber {
  #subscriptions: Subscription[] = [];

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(WorkflowServiceToken)
    private readonly workflows: WorkflowServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () =>
          '[RuleExecutorWorkflowSubscriber] start() called more than once. Ignoring. Subscriptions already active.',
      });

      return;
    }

    for (const trigger of RULE_EXECUTOR_WORKFLOW_TRIGGERS) {
      const subscription = this.bus.subscribe(trigger.eventType, (event, context) =>
        this.#dispatch(trigger, event as RuleExecutorEvent, context)
      );

      this.#subscriptions.push(subscription);
    }
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }

  async #dispatch(
    trigger: RuleExecutorWorkflowTriggerBinding,
    event: RuleExecutorEvent,
    context: AlertingPublisherContext
  ): Promise<void> {
    try {
      const payload = trigger.toPayload(event);

      // A `null` payload means the binding chose not to emit for this event
      // (e.g. a run that produced no rule events). Nothing to forward.
      if (payload === null) {
        return;
      }

      await this.workflows.emitEvent(context.request, trigger.triggerId, payload);
    } catch (err) {
      this.logger.error({
        error: err,
        code: ALERTING_V2_LOG_CODES.RULE_EXECUTOR_WORKFLOW_SUBSCRIBER_FAILURE,
        type: `RuleExecutorWorkflowSubscriber:${trigger.triggerId}`,
      });
    }
  }
}
