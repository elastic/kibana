/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { CoreStart } from '@kbn/core-di-server';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { buildRuleCreatedEventData, RULE_CREATED_EVENT } from '../../telemetry/rule_created_event';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { RULE_CREATED_EVENT_TYPE, type RuleEvent } from '../rule_event_publisher/events';

/**
 * Singleton bus subscriber that reports rule-lifecycle domain events as
 * event-based telemetry (EBT).
 *
 * Telemetry is best-effort: a failure to report is logged at `debug` and never
 * affects the rule operation that produced the event. Events without a domain
 * rule are skipped since there is nothing to project.
 */
@injectable()
export class RuleTelemetrySubscriber {
  #subscriptions: Subscription[] = [];

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(CoreStart('analytics'))
    private readonly analytics: Pick<AnalyticsServiceStart, 'reportEvent'>,
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

    this.#subscriptions.push(
      this.bus.subscribe(RULE_CREATED_EVENT_TYPE, (event) =>
        this.#reportRuleCreated(event as RuleEvent)
      )
    );
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }

  #reportRuleCreated(event: RuleEvent): void {
    const { ruleId, spaceId, rule } = event.payload;

    if (!rule) {
      return;
    }

    try {
      this.analytics.reportEvent(RULE_CREATED_EVENT.eventType, buildRuleCreatedEventData(rule));
    } catch (err) {
      this.logger.debug({
        message: () => `Failed to report rule created telemetry event: ${err}`,
        labels: { event_type: event.type, rule_id: ruleId, space_id: spaceId },
      });
    }
  }
}
