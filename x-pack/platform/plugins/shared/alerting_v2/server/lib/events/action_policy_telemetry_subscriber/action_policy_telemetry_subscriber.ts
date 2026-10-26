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
import type { EventBus, Subscription } from '../event_bus';
import type { ActionPolicyEvent } from '../action_policy_event_publisher/events';

/**
 * Singleton bus subscriber that reports action policy lifecycle domain events
 * as event-based telemetry (EBT) through the {@link EbtServiceContract}.
 *
 * Events without a domain policy are not reported, because every reported
 * field except the id comes from the policy.
 */
@injectable()
export class ActionPolicyTelemetrySubscriber {
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

    for (const eventType of ACTION_POLICY_OPERATIONS) {
      this.#subscriptions.push(
        this.bus.subscribe<ActionPolicyEvent>(eventType, (event, context) =>
          this.#reportActionPolicyChanged(event, context)
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

  #reportActionPolicyChanged(event: ActionPolicyEvent, { origin }: AlertingPublisherContext): void {
    const {
      type,
      payload: { policy, spaceId },
    } = event;
    if (policy === undefined) {
      return;
    }

    this.ebtService.reportEvent(
      ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[type],
      buildActionPolicyChangedEventData(policy, origin, spaceId)
    );
  }
}
