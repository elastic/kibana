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
  buildRuleChangedEventData,
  RULE_EBT_EVENT_TYPE_BY_OPERATION,
  RULE_OPERATIONS,
  type RuleOperation,
} from '../../telemetry/rule_ebt_event';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import type { RuleEvent } from '../rule_event_publisher/events';

type ReportedRuleEvent = Extract<RuleEvent, { type: RuleOperation }>;

/**
 * Singleton bus subscriber that reports rule-lifecycle domain events as
 * event-based telemetry (EBT) through the {@link EbtServiceContract}.
 *
 * Events without a domain rule still report `rule_id` and `origin`. Fields that
 * come from the rule are omitted.
 */
@injectable()
export class RuleTelemetrySubscriber {
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

    for (const eventType of RULE_OPERATIONS) {
      this.#subscriptions.push(
        this.bus.subscribe<ReportedRuleEvent>(eventType, (event, context) =>
          this.#reportRuleChanged(event, context)
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

  #reportRuleChanged(event: ReportedRuleEvent, { origin: actor }: AlertingPublisherContext): void {
    const { type: operation, payload } = event;
    const { ruleId, rule, origin } = payload;

    this.ebtService.reportEvent(
      RULE_EBT_EVENT_TYPE_BY_OPERATION[operation],
      buildRuleChangedEventData(rule, { ...origin, actor }, ruleId)
    );
  }
}
