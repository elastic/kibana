/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_EPISODE_ACTION_TYPE, type AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { EbtServiceToken } from '../../services/ebt_service/tokens';
import {
  ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE,
  buildAlertActionAppliedEventData,
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
 * One domain event is one telemetry event. Assign and clear-assignee share
 * `assign`. `rule_id` is omitted when the alert has no rule id.
 */
@injectable()
export class AlertActionTelemetrySubscriber {
  #subscriptions: Subscription[] = [];

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

    for (const eventType of REPORTED_ALERT_ACTION_EVENT_TYPES) {
      this.#subscriptions.push(
        this.bus.subscribe<AlertActionEvent>(eventType, (event, context) =>
          this.#reportAlertAction(event, context)
        )
      );
    }
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }

  #reportAlertAction(event: AlertActionEvent, { origin }: AlertingPublisherContext): void {
    const actionType = ACTION_TYPE_BY_DOMAIN_EVENT[event.type];

    this.ebtService.reportEvent(
      ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE[actionType],
      buildAlertActionAppliedEventData({
        spaceId: event.spaceId,
        ruleId: event.ruleId,
        origin,
      })
    );
  }
}
