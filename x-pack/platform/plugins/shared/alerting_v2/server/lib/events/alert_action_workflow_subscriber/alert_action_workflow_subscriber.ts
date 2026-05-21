/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { WorkflowServiceToken } from '../../services/workflow_service/tokens';
import type { WorkflowServiceContract } from '../../services/workflow_service/workflow_service';
import type { AlertActionEvent } from '../alert_action_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { ALERT_ACTION_WORKFLOW_TRIGGERS, type AlertActionWorkflowTriggerBinding } from './triggers';

/**
 * Singleton bus subscriber that routes alert-action domain events to the
 * workflows-extensions emit path via {@link WorkflowServiceContract}.
 *
 * Design notes:
 *
 *  - **Generic dispatcher.** The subscriber has no hard-coded knowledge
 *    of any specific alert-action event. It walks
 *    {@link ALERT_ACTION_WORKFLOW_TRIGGERS} and subscribes one handler
 *    per binding. Adding a new alert-action → trigger mapping is a
 *    one-file change in `./triggers/`, not a change here.
 *
 *  - **Lifecycle.** `start()` must be called once during the plugin's
 *    `OnStart` phase.
 *
 *  - **Error handling.** Each handler runs inside its own try/catch and
 *    logs failures with the binding's `triggerId` attached. The
 *    `AsyncDomainEventBus` already isolates handlers from each other,
 *    but logging the `triggerId` is more useful for triage than the
 *    bare bus-event-type tag the bus alone would emit.
 *
 *  - **Auth model.** The publisher's {@link AlertingPublisherContext}
 *    carries the originating `KibanaRequest` across the bus's
 *    `setImmediate` hop. This subscriber forwards that request to
 *    {@link WorkflowServiceContract.emitEvent}, so the resulting
 *    workflow execution runs under the publishing user's identity (or
 *    a synthesised system request if the publisher chose to provide
 *    one). See `lib/services/workflow_service/README.md` for the
 *    auth implications.
 */
@injectable()
export class AlertActionWorkflowSubscriber {
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
          '[AlertActionWorkflowSubscriber] start() called more than once. Ignoring. Subscriptions already active.',
      });

      return;
    }

    for (const trigger of ALERT_ACTION_WORKFLOW_TRIGGERS) {
      const subscription = this.bus.subscribe(trigger.eventType, (event, context) =>
        this.#dispatch(trigger, event as AlertActionEvent, context)
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
    trigger: AlertActionWorkflowTriggerBinding,
    event: AlertActionEvent,
    context: AlertingPublisherContext
  ): Promise<void> {
    try {
      const payload = trigger.toPayload(event);
      await this.workflows.emitEvent(context.request, trigger.triggerId, payload);
    } catch (err) {
      this.logger.error({
        error: err,
        code: 'ALERT_ACTION_WORKFLOW_SUBSCRIBER_FAILURE',
        type: `AlertActionWorkflowSubscriber:${trigger.triggerId}`,
      });
    }
  }
}
