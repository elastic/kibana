/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_EPISODE_ACTION_TYPE, type AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { EbtServiceToken } from '../../services/ebt_service/tokens';
import {
  reportAppliedAlertActions,
  type AppliedAlertAction,
} from '../../telemetry/alert_action_ebt_event';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import {
  EPISODE_ACKED_EVENT_TYPE,
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_ASSIGNED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
  EPISODE_SNOOZED_EVENT_TYPE,
  EPISODE_TAGGED_EVENT_TYPE,
  EPISODE_UNACKED_EVENT_TYPE,
  EPISODE_UNASSIGNED_EVENT_TYPE,
  EPISODE_UNSNOOZED_EVENT_TYPE,
  type AlertActionEvent,
} from '../alert_action_event_publisher/events';

/**
 * Domain event types this subscriber reports. Assign and clear-assignee are
 * two event types and one action type (`assign`).
 */
const ACTION_TYPE_BY_DOMAIN_EVENT = {
  [EPISODE_ACKED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.ACK,
  [EPISODE_UNACKED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.UNACK,
  [EPISODE_ASSIGNED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
  [EPISODE_UNASSIGNED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
  [EPISODE_TAGGED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.TAG,
  [EPISODE_SNOOZED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
  [EPISODE_UNSNOOZED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
  [EPISODE_ACTIVATED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
  [EPISODE_DEACTIVATED_EVENT_TYPE]: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
} as const satisfies Record<AlertActionEvent['type'], AlertEpisodeActionType>;

const REPORTED_ALERT_ACTION_EVENT_TYPES = Object.keys(ACTION_TYPE_BY_DOMAIN_EVENT) as Array<
  keyof typeof ACTION_TYPE_BY_DOMAIN_EVENT
>;

/**
 * Singleton bus subscriber that reports alert-action domain events as
 * event-based telemetry (EBT) through the {@link EbtServiceContract}.
 *
 * The bus delivers one event per alert. Telemetry is one event per action
 * type, space, and rule, so this subscriber buffers the events delivered in
 * one turn and reports them on the next `setImmediate`. `alert_count` is that
 * group's size. Assign and clear-assignee share `assign`.
 */
@injectable()
export class AlertActionTelemetrySubscriber {
  #subscriptions: Subscription[] = [];
  #pending: AppliedAlertAction[] = [];
  #flushScheduled = false;
  #accepting = false;

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(EbtServiceToken) private readonly ebtService: EbtServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('events');
  }

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () => 'Subscriber start called more than once; ignoring',
      });

      return;
    }

    this.#accepting = true;

    for (const eventType of REPORTED_ALERT_ACTION_EVENT_TYPES) {
      this.#subscriptions.push(
        this.bus.subscribe<AlertActionEvent>(eventType, (event, context) =>
          this.#enqueue(event, context)
        )
      );
    }
  }

  public stop(): void {
    this.#accepting = false;
    this.#pending = [];

    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }

  #enqueue(event: AlertActionEvent, { origin }: AlertingPublisherContext): void {
    if (!this.#accepting) {
      return;
    }

    this.#pending.push({
      actionType: ACTION_TYPE_BY_DOMAIN_EVENT[event.type],
      spaceId: event.spaceId,
      ruleId: event.ruleId,
      origin,
    });

    if (this.#flushScheduled) {
      return;
    }

    this.#flushScheduled = true;
    // Handlers for one publish run in the same turn. Reporting on the next
    // turn groups them into one EBT event per action type, space, and rule.
    setImmediate(() => this.#flush());
  }

  #flush(): void {
    this.#flushScheduled = false;
    const pending = this.#pending;
    this.#pending = [];

    if (!this.#accepting || pending.length === 0) {
      return;
    }

    try {
      reportAppliedAlertActions(this.ebtService, pending);
    } catch (error) {
      this.logger.error({
        message: () => 'Failed to report alert action telemetry',
        error,
        code: ALERTING_LOG_CODES.TELEMETRY_EBT_REPORT_FAILED,
      });
    }
  }
}
