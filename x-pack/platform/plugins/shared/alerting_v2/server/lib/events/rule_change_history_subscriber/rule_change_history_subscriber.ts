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
import {
  RuleChangeHistoryServiceToken,
  type RuleChangeHistoryServiceContract,
} from '../../rule_change_history';
import type { RuleEvent } from '../rule_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { RULE_CHANGE_HISTORY_MAPPINGS } from './mappings';

/**
 * Singleton bus subscriber that logs rule-lifecycle domain events to the rule
 * change-history data stream via {@link RuleChangeHistoryServiceContract}.
 *
 * Only events that carry a change-history payload (`snapshot` + `sequence` +
 * `author`) are logged; bare events (e.g. the bulk-delete fallback where the
 * pre-delete state could not be read) are skipped since there is nothing
 * orderable to persist.
 */
@injectable()
export class RuleChangeHistorySubscriber {
  #subscriptions: Subscription[] = [];

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(RuleChangeHistoryServiceToken)
    private readonly changeHistory: RuleChangeHistoryServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () =>
          '[RuleChangeHistorySubscriber] start() called more than once. Ignoring. Subscriptions already active.',
      });

      return;
    }

    for (const eventType of Object.keys(RULE_CHANGE_HISTORY_MAPPINGS) as Array<RuleEvent['type']>) {
      const subscription = this.bus.subscribe(eventType, (event) =>
        this.#dispatch(event as RuleEvent)
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

  async #dispatch(event: RuleEvent): Promise<void> {
    const { rule, snapshot, sequence, author, correlationId } = event.payload;

    // Nothing loggable without a snapshot, an orderable sequence and an author.
    if (!snapshot || sequence === undefined || !author) {
      return;
    }

    const { action, eventType } = RULE_CHANGE_HISTORY_MAPPINGS[event.type];

    try {
      await this.changeHistory.logRuleChanges({
        spaceId: rule.spaceId,
        author,
        entries: [{ id: rule.ruleId, snapshot, sequence }],
        action,
        eventType,
        ...(correlationId ? { correlationId } : {}),
      });
    } catch (err) {
      this.logger.error({
        error: err,
        code: 'RULE_CHANGE_HISTORY_SUBSCRIBER_FAILURE',
        type: `RuleChangeHistorySubscriber:${event.type}`,
      });
    }
  }
}
