/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
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
import type { EventBus } from '../event_bus';
import {
  BaseEventBusSubscriber,
  type EventBusSubscriptionSpec,
} from '../base_event_bus_subscriber';
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
export class RuleExecutorWorkflowSubscriber extends BaseEventBusSubscriber {
  constructor(
    @inject(AlertingDomainEventBusToken)
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(WorkflowServiceToken)
    private readonly workflows: WorkflowServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    super(bus, loggerService.forSubsystem('events'));
  }

  protected getSubscriptions(): EventBusSubscriptionSpec[] {
    return RULE_EXECUTOR_WORKFLOW_TRIGGERS.map((trigger) =>
      this.on(trigger.eventType, (event, context) => this.#dispatch(trigger, event, context))
    );
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
      // The succeeded and failed payloads name the rule id differently.
      const { rule } = event.payload;

      this.logger.error({
        error: err,
        code: ALERTING_LOG_CODES.EVENTS_RULE_EXECUTOR_WORKFLOW_SUBSCRIBER_FAILED,
        labels: {
          event_type: trigger.eventType,
          rule_id: 'ruleId' in rule ? rule.ruleId : rule.id,
          space_id: rule.spaceId,
        },
      });
    }
  }
}
