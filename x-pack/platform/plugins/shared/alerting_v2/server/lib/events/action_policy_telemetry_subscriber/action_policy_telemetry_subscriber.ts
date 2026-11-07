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
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { EbtServiceToken } from '../../services/ebt_service/tokens';
import {
  ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION,
  ACTION_POLICY_OPERATIONS,
  buildActionPolicyChangedEventData,
} from '../../telemetry/action_policy_ebt_event';
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
import type { ActionPolicyEvent } from '../action_policy_event_publisher/events';

/**
 * Singleton bus subscriber that reports action policy lifecycle domain events
 * as event-based telemetry (EBT) through the {@link EbtServiceContract}.
 *
 * Events without a domain policy still report `action_policy_id`, `space_id`
 * and `origin`. Fields that come from the policy are omitted.
 */
@injectable()
export class ActionPolicyTelemetrySubscriber extends BaseEventBusSubscriber {
  constructor(
    @inject(AlertingDomainEventBusToken)
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(EbtServiceToken) private readonly ebtService: EbtServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    super(bus, loggerService.forSubsystem('events'));
  }

  protected getSubscriptions(): EventBusSubscriptionSpec[] {
    return ACTION_POLICY_OPERATIONS.map((eventType) =>
      this.on(eventType, (event, context) => this.#reportActionPolicyChanged(event, context))
    );
  }

  #reportActionPolicyChanged(event: ActionPolicyEvent, { origin }: AlertingPublisherContext): void {
    const {
      type,
      payload: { actionPolicyId, policy, spaceId },
    } = event;

    this.ebtService.reportEvent(
      ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[type],
      buildActionPolicyChangedEventData(policy, origin, actionPolicyId, spaceId)
    );
  }
}
