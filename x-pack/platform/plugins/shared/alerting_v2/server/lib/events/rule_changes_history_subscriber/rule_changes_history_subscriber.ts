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
import type { RuleEvent } from '../rule_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { RULE_LIFECYCLE_TO_CHANGES_HISTORY_MAP } from './mappings';
import { RuleChangesHistoryEventLogger } from './rule_changes_history_event_logger';

/**
 * Singleton bus subscriber that logs rule-lifecycle domain events to the rule
 * changes-history data stream via {@link RuleChangesHistoryEventLogger}.
 * Events whose publisher already logged them (`changeHistoryLogged`) are
 * skipped.
 */
@injectable()
export class RuleChangesHistorySubscriber {
  #subscriptions: Subscription[] = [];

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(RuleChangesHistoryEventLogger)
    private readonly eventLogger: RuleChangesHistoryEventLogger,
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

    for (const eventType of Object.keys(RULE_LIFECYCLE_TO_CHANGES_HISTORY_MAP) as Array<
      RuleEvent['type']
    >) {
      const subscription = this.bus.subscribe(eventType, (event, context) =>
        this.#dispatch(event as RuleEvent, context)
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

  async #dispatch(event: RuleEvent, context: AlertingPublisherContext): Promise<void> {
    if (event.payload.changeHistoryLogged) {
      return;
    }

    await this.eventLogger.log(event, context);
  }
}
