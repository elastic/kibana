/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { AlertStatusChangedTriggerId } from '../../../../common/workflows/triggers';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { WorkflowServiceToken } from '../../services/workflow_service/tokens';
import type { WorkflowServiceContract } from '../../services/workflow_service/workflow_service';
import {
  ALERT_STATUS_CHANGED_EVENT_TYPE,
  type AlertStatusChangedEvent,
} from '../alert_status_changed_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';

/**
 * Singleton bus subscriber that forwards `alert.status.changed` domain events
 * to the `alerting.alertStatusChanged` workflow trigger via
 * {@link WorkflowServiceContract}, under the publisher's request.
 *
 * The bus payload already is the trigger payload, so there is no binding
 * catalog to walk. Publishers only publish once an integration has opted in.
 */
@injectable()
export class AlertStatusChangedWorkflowSubscriber {
  #subscription: Subscription | null = null;

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(WorkflowServiceToken)
    private readonly workflows: WorkflowServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('events');
  }

  public start(): void {
    if (this.#subscription !== null) {
      this.logger.debug({
        message: () => 'Subscriber start called more than once; ignoring',
      });

      return;
    }

    this.#subscription = this.bus.subscribe(ALERT_STATUS_CHANGED_EVENT_TYPE, (event, context) =>
      this.#dispatch(event as AlertStatusChangedEvent, context)
    );
  }

  public stop(): void {
    this.#subscription?.unsubscribe();
    this.#subscription = null;
  }

  async #dispatch(
    event: AlertStatusChangedEvent,
    context: AlertingPublisherContext
  ): Promise<void> {
    try {
      await this.workflows.emitEvent(context.request, AlertStatusChangedTriggerId, event.payload);
    } catch (err) {
      const { spaceId, alert, rule } = event.payload;

      this.logger.error({
        error: err,
        code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_WORKFLOW_SUBSCRIBER_FAILED,
        labels: {
          event_type: ALERT_STATUS_CHANGED_EVENT_TYPE,
          space_id: spaceId,
          alert_id: alert.id,
          ...(rule != null ? { rule_id: rule.id } : {}),
        },
      });
    }
  }
}
